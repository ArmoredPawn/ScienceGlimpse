import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  sendEmailVerification,
  signOut,
  type User,
} from "firebase/auth";
import {
  doc,
  getDoc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  setDoc,
  type Timestamp,
} from "firebase/firestore";

import { auth, db } from "../lib/firebase";

/**
 * A moderator-issued suspension of the signed-in account, from
 * suspensions/{uid}. Firestore rules refuse the account's writes while
 * it exists; SuspensionGate shows the reason in place of the site.
 */
export interface Suspension {
  reason: string;
  createdAt: Date | null;
}

/**
 * From moderators/{uid}: "owner" when that document has owner: true
 * (set by hand in the Firebase console), "moderator" when it exists
 * without it. Only owners can make or remove moderators.
 */
export type ModeratorRole = "owner" | "moderator";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  /**
   * False for a password account that hasn't clicked its verification
   * link yet. firestore.rules won't let it earn tokens until it has.
   */
  emailVerified: boolean;
  sendVerificationEmail: () => Promise<void>;
  suspension: Suspension | null;
  /** The signed-in account's role, or null for a regular user. */
  moderatorRole: ModeratorRole | null;
  moderatorRoleLoading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(
  undefined,
);

interface AuthProviderProps {
  children: ReactNode;
}

class UsernameTakenError extends Error {}

/*
 * Set by the sign-up page just before createUserWithEmailAndPassword, so
 * the username the user chose is the one claimed here. Without it
 * onAuthStateChanged would fire first and mint a username derived from
 * their email instead.
 */
let preferredUsername: string | null = null;

export function setPreferredUsername(
  username: string | null,
): void {
  preferredUsername = username;
}

const normalizeUsername = (value: string): string =>
  value.trim().toLowerCase();

const hasPasswordProvider = (user: User): boolean =>
  user.providerData.some(
    (provider) => provider.providerId === "password",
  );

/*
 * Lets somebody sign in with their username instead of their email.
 *
 * Firebase Auth only ever authenticates by email, and a signed-out
 * visitor cannot read users/{uid} to discover it, so the login page needs
 * a mapping it can read before anyone is authenticated — that is
 * usernames/{name}, which is publicly gettable (but not listable).
 *
 * Written only for accounts that actually have a password, since those
 * are the only ones that can use username-and-password login. A
 * Google-only account never has its address copied here.
 */
async function ensureUsernameLoginEmail(
  user: User,
): Promise<void> {
  if (!user.email || !hasPasswordProvider(user)) {
    return;
  }

  try {
    const profileSnapshot = await getDoc(
      doc(db, "users", user.uid),
    );

    if (!profileSnapshot.exists()) {
      return;
    }

    const username = profileSnapshot.data().username;

    if (typeof username !== "string" || !username) {
      return;
    }

    const usernameReference = doc(db, "usernames", username);
    const usernameSnapshot = await getDoc(usernameReference);

    if (
      !usernameSnapshot.exists() ||
      usernameSnapshot.data().uid !== user.uid ||
      usernameSnapshot.data().email === user.email
    ) {
      return;
    }

    await setDoc(
      usernameReference,
      { uid: user.uid, email: user.email },
      { merge: true },
    );
  } catch (error) {
    console.error(
      "Could not record the username login email:",
      error,
    );
  }
}

/*
 * New accounts start with a welcome balance so a first visit to Science
 * Summit is playable before you have read anything.
 *
 * It is written as a single tokenLedger entry under a fixed document ID.
 * The ID is what makes it safe: firestore.rules allows create and never
 * update or delete, so "signup_bonus" can only ever exist once per
 * account and is worth exactly SIGNUP_BONUS_TOKENS. Balances are summed
 * from tokenLedger already, so nothing else needs to know about it.
 */
export const SIGNUP_BONUS_TOKENS = 30;

const SIGNUP_BONUS_DOCUMENT_ID = "signup_bonus";

function createDefaultUsername(user: User): string {
  const source =
    user.displayName ||
    user.email?.split("@")[0] ||
    "scienceuser";

  const normalizedUsername = source
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 20);

  if (normalizedUsername.length >= 3) {
    return normalizedUsername;
  }

  return `user_${user.uid.slice(0, 8).toLowerCase()}`;
}

/*
 * Grants the welcome balance, and is safe to call on every sign-in.
 *
 * This deliberately does not check whether the account was created just
 * now. Tying it to that moment gave it exactly one chance to ever run:
 * anything that went wrong then — rules not yet published, a dropped
 * connection — left the account permanently short, with no path to
 * recovery. Checking for the document instead means a sign-in always
 * repairs a missing bonus.
 *
 * Paying twice is impossible regardless of how often this runs, because
 * firestore.rules allows create on this fixed document ID and refuses
 * update and delete. The read below is what keeps the normal case quiet
 * rather than firing a write the rules would reject.
 */
async function ensureSignupBonus(user: User): Promise<void> {
  const bonusReference = doc(
    db,
    "users",
    user.uid,
    "tokenLedger",
    SIGNUP_BONUS_DOCUMENT_ID,
  );

  try {
    const bonusSnapshot = await getDoc(bonusReference);

    if (bonusSnapshot.exists()) {
      return;
    }

    await setDoc(bonusReference, {
      amount: SIGNUP_BONUS_TOKENS,
      type: "signup_bonus",
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    // Never allowed to break signing in — a missing bonus is recoverable
    // on the next sign-in, or by hand from the Admin dashboard.
    console.error("Could not grant the signup bonus:", error);
  }
}

/*
 * Keeps a copy of the account's own email on its profile document.
 *
 * Emails live in Firebase Authentication, which a client can only read
 * for the signed-in user — never for anybody else. The Admin dashboard
 * therefore has no way to display or search by email unless each account
 * records its own, which is what this does. users/{uid} is readable only
 * by its owner or a moderator, so nothing is exposed more widely.
 *
 * Kept out of profile creation deliberately: if the rules permitting the
 * field are not published yet, a refused write here is harmless, whereas
 * inside the creation path it would take the whole profile down with it.
 * Runs on every sign-in, so existing accounts fill in as people return
 * and an address that changes is picked up.
 */
async function ensureProfileEmail(user: User): Promise<void> {
  if (!user.email) {
    return;
  }

  const profileReference = doc(db, "users", user.uid);

  try {
    const profileSnapshot = await getDoc(profileReference);

    if (
      !profileSnapshot.exists() ||
      profileSnapshot.data().email === user.email
    ) {
      return;
    }

    await setDoc(
      profileReference,
      {
        email: user.email,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  } catch (error) {
    console.error("Could not record the account email:", error);
  }
}

/*
 * Stamps the profile with when this account was last on the site, for
 * the Admin dashboard's "Last seen" column. Runs on every page load that
 * restores a session, and again when a tab left open comes back into
 * view — throttled, so flicking between tabs isn't a write each time.
 * Like the email above, a refused write is only logged.
 */
const LAST_SEEN_INTERVAL_MS = 5 * 60 * 1000;

let lastSeenRecorded: { uid: string; at: number } | null = null;

async function recordLastSeen(user: User): Promise<void> {
  if (
    lastSeenRecorded?.uid === user.uid &&
    Date.now() - lastSeenRecorded.at < LAST_SEEN_INTERVAL_MS
  ) {
    return;
  }

  lastSeenRecorded = { uid: user.uid, at: Date.now() };

  try {
    await setDoc(
      doc(db, "users", user.uid),
      { lastSeenAt: serverTimestamp() },
      { merge: true },
    );
  } catch (error) {
    console.error("Could not record last seen time:", error);
  }
}

function toSuspension(
  data: Record<string, unknown>,
): Suspension {
  const createdAt = data.createdAt as Timestamp | undefined;

  return {
    reason:
      typeof data.reason === "string" ? data.reason : "",
    createdAt: createdAt?.toDate?.() ?? null,
  };
}

/*
 * Read once before the sign-in housekeeping below, which a suspended
 * account is not allowed to do — every one of those writes would only
 * be refused by the rules and logged as an error. A failed read (rules
 * not yet published, offline) counts as not suspended: the rules are
 * what actually enforce a suspension, this only saves pointless writes.
 */
async function isSuspended(user: User): Promise<boolean> {
  try {
    const snapshot = await getDoc(
      doc(db, "suspensions", user.uid),
    );

    return snapshot.exists();
  } catch {
    return false;
  }
}

async function ensureUserProfile(user: User): Promise<void> {
  const profileReference = doc(db, "users", user.uid);

  // A username chosen on the sign-up page wins over a derived one.
  const chosenUsername = preferredUsername
    ? normalizeUsername(preferredUsername)
    : null;

  preferredUsername = null;

  const baseUsername =
    chosenUsername && chosenUsername.length >= 3
      ? chosenUsername
      : createDefaultUsername(user);

  for (let attempt = 0; attempt < 100; attempt += 1) {
    const suffix =
      attempt === 0 ? "" : `_${attempt + 1}`;

    const availableLength = 20 - suffix.length;

    const username =
      `${baseUsername.slice(0, availableLength)}${suffix}`;

    const usernameReference = doc(
      db,
      "usernames",
      username,
    );

    try {
      await runTransaction(db, async (transaction) => {
        const profileSnapshot =
          await transaction.get(profileReference);

        // Do not replace an existing username.
        if (profileSnapshot.exists()) {
          return;
        }

        const usernameSnapshot =
          await transaction.get(usernameReference);

        if (
          usernameSnapshot.exists() &&
          usernameSnapshot.data().uid !== user.uid
        ) {
          throw new UsernameTakenError();
        }

        transaction.set(usernameReference, {
          uid: user.uid,
        });

        transaction.set(profileReference, {
          username,
          photoURL: user.photoURL ?? "",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });

      return;
    } catch (error) {
      if (error instanceof UsernameTakenError) {
        continue;
      }

      throw error;
    }
  }

  throw new Error(
    "Could not generate an available default username.",
  );
}

export function AuthProvider({
  children,
}: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [emailVerified, setEmailVerified] = useState(false);
  const [suspension, setSuspension] =
    useState<Suspension | null>(null);

  useEffect(() => {
    let active = true;

    const unsubscribe = onAuthStateChanged(
      auth,
      (currentUser) => {
        void (async () => {
          let profileReady = false;

          try {
            // The profile has to exist before pages see the user —
            // Profile.tsx reads it once on load.
            if (
              currentUser &&
              !(await isSuspended(currentUser))
            ) {
              await ensureUserProfile(currentUser);
              profileReady = true;
            }
          } catch (error) {
            console.error(
              "Could not create default user profile:",
              error,
            );
          } finally {
            if (active) {
              setUser(currentUser);
              setEmailVerified(currentUser?.emailVerified ?? false);
              setLoading(false);
            }
          }

          /*
           * Best-effort upkeep that no page waits on, so it runs after
           * loading ends. Awaiting it used to hold back the Profile and
           * Log in buttons: recordLastSeen's write waits for the server,
           * so a slow or stalled Firestore connection kept them hidden
           * indefinitely. Each step logs its own failures.
           */
          if (currentUser && profileReady) {
            await ensureProfileEmail(currentUser);
            await ensureUsernameLoginEmail(currentUser);

            // Waits for a verified email (firestore.rules); the
            // effect below grants it the moment they verify.
            if (currentUser.emailVerified) {
              await ensureSignupBonus(currentUser);
            }

            await recordLastSeen(currentUser);
          }
        })();
      },
      (error) => {
        console.error("Authentication error:", error);

        if (active) {
          setLoading(false);
        }
      },
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  /*
   * Watched live rather than read once, so a suspension or restore from
   * the Admin dashboard reaches someone who is already on the site without
   * them having to reload.
   */
  const uid = user?.uid ?? null;

  useEffect(() => {
    if (!uid) {
      setSuspension(null);
      return;
    }

    return onSnapshot(
      doc(db, "suspensions", uid),
      (snapshot) => {
        setSuspension(
          snapshot.exists()
            ? toSuspension(snapshot.data())
            : null,
        );
      },
      (error) => {
        console.error(
          "Could not check account suspension:",
          error,
        );
        setSuspension(null);
      },
    );
  }, [uid]);

  /*
   * Verifying means clicking a link in an email, usually in another tab,
   * and nothing tells this one. So an unverified account rechecks each
   * time the site comes back into focus. The ID token is refreshed too,
   * because the rules read email_verified from the token, and an old
   * token would go on saying "unverified" for up to an hour.
   */
  useEffect(() => {
    if (!user || emailVerified) {
      return;
    }

    let active = true;
    let checking = false;

    const checkVerification = async () => {
      if (checking || document.visibilityState !== "visible") {
        return;
      }

      checking = true;

      try {
        await user.reload();

        if (!user.emailVerified || !active) {
          return;
        }

        await user.getIdToken(true);

        if (active) {
          setEmailVerified(true);
        }

        if (!(await isSuspended(user))) {
          await ensureSignupBonus(user);
        }
      } catch (error) {
        console.error(
          "Could not check email verification:",
          error,
        );
      } finally {
        checking = false;
      }
    };

    window.addEventListener("focus", checkVerification);
    document.addEventListener(
      "visibilitychange",
      checkVerification,
    );

    return () => {
      active = false;
      window.removeEventListener("focus", checkVerification);
      document.removeEventListener(
        "visibilitychange",
        checkVerification,
      );
    };
  }, [user, emailVerified]);

  useEffect(() => {
    if (!user || suspension) {
      return;
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void recordLastSeen(user);
      }
    };

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange,
    );

    return () =>
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange,
      );
  }, [user, suspension]);

  /*
   * Watched live like the suspension, so the Admin link appears (or
   * disappears) the moment an owner changes this account's role. Stored
   * with the uid it was read for, so a role from a previous account is
   * never shown, and the role counts as loading until this account's
   * first snapshot arrives.
   */
  const [moderatorState, setModeratorState] = useState<{
    uid: string;
    role: ModeratorRole | null;
  } | null>(null);

  useEffect(() => {
    if (!uid) {
      return;
    }

    return onSnapshot(
      doc(db, "moderators", uid),
      (snapshot) => {
        setModeratorState({
          uid,
          role: !snapshot.exists()
            ? null
            : snapshot.data().owner === true
              ? "owner"
              : "moderator",
        });
      },
      (error) => {
        console.error(
          "Could not check moderator access:",
          error,
        );
        setModeratorState({ uid, role: null });
      },
    );
  }, [uid]);

  const moderatorRoleLoading =
    uid !== null && moderatorState?.uid !== uid;

  const moderatorRole =
    uid !== null && moderatorState?.uid === uid
      ? moderatorState.role
      : null;

  async function logout() {
    await signOut(auth);
  }

  async function sendVerificationEmail() {
    if (auth.currentUser) {
      await sendEmailVerification(auth.currentUser);
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        emailVerified,
        sendVerificationEmail,
        suspension,
        moderatorRole,
        moderatorRoleLoading,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error(
      "useAuth must be used inside an AuthProvider.",
    );
  }

  return context;
}