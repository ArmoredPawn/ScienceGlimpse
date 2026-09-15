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

async function ensureUserProfile(user: User): Promise<void> {
  const profileReference = doc(db, "users", user.uid);
  const baseUsername = createDefaultUsername(user);

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

    const bonusReference = doc(
      db,
      "users",
      user.uid,
      "tokenLedger",
      SIGNUP_BONUS_DOCUMENT_ID,
    );

    let profileWasCreated = false;

    try {
      await runTransaction(db, async (transaction) => {
        // Reset per attempt: a transaction callback can run more than
        // once, and only the attempt that commits should count.
        profileWasCreated = false;

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

        profileWasCreated = true;
      });

      /*
       * Deliberately outside the transaction above. Bundling the two
       * would mean a refused bonus — rules not yet deployed, say — takes
       * profile creation down with it, leaving a signed-in user with no
       * profile and no username. A missing welcome balance a moderator
       * can grant by hand is the far cheaper failure.
       *
       * Guarded on profileWasCreated so this only ever fires for a
       * genuinely new account, never for an existing one signing back in.
       */
      if (profileWasCreated) {
        try {
          await setDoc(bonusReference, {
            amount: SIGNUP_BONUS_TOKENS,
            type: "signup_bonus",
            createdAt: serverTimestamp(),
          });
        } catch (bonusError) {
          console.error(
            "Could not grant the signup bonus:",
            bonusError,
          );
        }
      }

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