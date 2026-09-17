import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signOut,
  type User,
} from "firebase/auth";
import {
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

import { auth, db } from "../lib/firebase";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
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
    // on the next sign-in, or by hand from the Mod dashboard.
    console.error("Could not grant the signup bonus:", error);
  }
}

/*
 * Keeps a copy of the account's own email on its profile document.
 *
 * Emails live in Firebase Authentication, which a client can only read
 * for the signed-in user — never for anybody else. The Mod dashboard
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

  useEffect(() => {
    let active = true;

    const unsubscribe = onAuthStateChanged(
      auth,
      (currentUser) => {
        void (async () => {
          try {
            if (currentUser) {
              await ensureUserProfile(currentUser);
              await ensureProfileEmail(currentUser);
              await ensureUsernameLoginEmail(currentUser);
              await ensureSignupBonus(currentUser);
            }
          } catch (error) {
            console.error(
              "Could not create default user profile:",
              error,
            );
          } finally {
            if (active) {
              setUser(currentUser);
              setLoading(false);
            }
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

  async function logout() {
    await signOut(auth);
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, logout }}
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