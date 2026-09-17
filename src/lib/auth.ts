import { FirebaseError } from "firebase/app";
import {
  browserLocalPersistence,
  browserSessionPersistence,
  setPersistence,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

import { auth, db } from "./firebase";

export const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;

/** Firebase rejects anything shorter outright. */
export const MIN_PASSWORD_LENGTH = 6;

export const looksLikeEmail = (value: string): boolean =>
  value.includes("@");

/*
 * "Remember me" is just which persistence Firebase uses for the session.
 * Local survives closing the browser; session ends with the tab, which is
 * what someone on a shared or school computer wants.
 *
 * Must be set before the sign-in call, not after — it decides where the
 * resulting session is written.
 */
export const applyPersistence = async (
  rememberMe: boolean,
): Promise<void> => {
  await setPersistence(
    auth,
    rememberMe
      ? browserLocalPersistence
      : browserSessionPersistence,
  );
};

export interface UsernameLookup {
  /** No account holds this username at all. */
  unknown: boolean;
  /**
   * The username exists but has no login email recorded, which means the
   * account has no password — a Google-only sign-in.
   */
  googleOnly: boolean;
  email: string | null;
}

/*
 * Turns a username into the email Firebase Auth needs.
 *
 * usernames/{name} is readable without being signed in (by exact name
 * only — the collection cannot be listed), which is what makes logging in
 * by username possible at all: nothing else is readable before auth.
 */
export const lookupUsernameEmail = async (
  rawUsername: string,
): Promise<UsernameLookup> => {
  const username = rawUsername.trim().toLowerCase();

  const snapshot = await getDoc(doc(db, "usernames", username));

  if (!snapshot.exists()) {
    return { unknown: true, googleOnly: false, email: null };
  }

  const email = snapshot.data().email;

  if (typeof email !== "string" || !email) {
    return { unknown: false, googleOnly: true, email: null };
  }

  return { unknown: false, googleOnly: false, email };
};

export const isUsernameTaken = async (
  rawUsername: string,
): Promise<boolean> => {
  const username = rawUsername.trim().toLowerCase();

  const snapshot = await getDoc(doc(db, "usernames", username));

  return snapshot.exists();
};

/*
 * Firebase's error codes are not for reading aloud. Newer projects also
 * have email-enumeration protection on, which collapses "no such user"
 * and "wrong password" into auth/invalid-credential on purpose — so the
 * message for that case deliberately does not say which was wrong.
 */
export const describeAuthError = (error: unknown): string => {
  if (!(error instanceof FirebaseError)) {
    return "Something went wrong. Please try again.";
  }

  switch (error.code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "That email, username or password is incorrect.";
    case "auth/invalid-email":
      return "That does not look like a valid email address.";
    case "auth/email-already-in-use":
      return "An account already exists with that email. Try logging in instead.";
    case "auth/weak-password":
      return `Choose a password of at least ${MIN_PASSWORD_LENGTH} characters.`;
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a few minutes and try again.";
    case "auth/popup-closed-by-user":
      return "The Google sign-in window was closed.";
    case "auth/popup-blocked":
      return "Your browser blocked the Google sign-in window. Please allow popups.";
    case "auth/requires-recent-login":
      return "For security, please log out and back in, then try again.";
    case "auth/operation-not-allowed":
      return "Email and password sign-in is not enabled for this project yet.";
    case "auth/credential-already-in-use":
    case "auth/provider-already-linked":
      return "That sign-in method is already attached to an account.";
    default:
      return "Something went wrong. Please try again.";
  }
};
