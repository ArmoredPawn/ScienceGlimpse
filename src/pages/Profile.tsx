import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import {
  EmailAuthProvider,
  linkWithCredential,
  reauthenticateWithCredential,
  updatePassword,
} from "firebase/auth";
import {
  Coins,
  KeyRound,
  UserCog,
  UserRound,
} from "lucide-react";

import AccountPageLayout from "../components/AccountPageLayout";
import { db } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/button";
import { subscribeToTokenBalance } from "../lib/tokens";
import {
  describeAuthError,
  MIN_PASSWORD_LENGTH,
} from "../lib/auth";

interface StoredProfile {
  username: string;
  photoURL: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;

const Profile = () => {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [savedUsername, setSavedUsername] = useState("");
  const [tokens, setTokens] = useState(0);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] =
    useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const hasPassword = Boolean(
    user?.providerData.some(
      (provider) => provider.providerId === "password",
    ),
  );

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!user) {
      navigate("/login", { replace: true });
      return;
    }

    const loadProfile = async () => {
      try {
        const profileReference = doc(db, "users", user.uid);
        const profileSnapshot = await getDoc(profileReference);

        if (profileSnapshot.exists()) {
          const profile = profileSnapshot.data() as StoredProfile;

          setUsername(profile.username);
          setSavedUsername(profile.username);
        }
      } catch (error) {
        console.error("Could not load profile:", error);
        setErrorMessage("Could not load your profile.");
      } finally {
        setLoadingProfile(false);
      }
    };

    void loadProfile();
  }, [loading, navigate, user]);

  useEffect(() => {
    if (loading || !user) {
      setTokens(0);
      return;
    }

    return subscribeToTokenBalance(
      user.uid,
      (balance) => setTokens(balance),
      (error) => {
        console.error("Could not load token balance:", error);
      },
    );
  }, [loading, user]);

  const handleUsernameChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const normalizedValue = event.target.value
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "");

    setUsername(normalizedValue);
    setMessage("");
    setErrorMessage("");
  };

  const handleSave = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!user) {
      return;
    }

    const normalizedUsername =
      username.trim().toLowerCase();

    if (!USERNAME_PATTERN.test(normalizedUsername)) {
      setErrorMessage(
        "Username must be 3–20 characters and contain only lowercase letters, numbers, or underscores.",
      );
      return;
    }

    setSaving(true);
    setMessage("");
    setErrorMessage("");

    try {
      const profileReference = doc(
        db,
        "users",
        user.uid,
      );

      const usernameReference = doc(
        db,
        "usernames",
        normalizedUsername,
      );

      await runTransaction(db, async (transaction) => {
        const profileSnapshot =
          await transaction.get(profileReference);

        const usernameSnapshot =
          await transaction.get(usernameReference);

        if (
          usernameSnapshot.exists() &&
          usernameSnapshot.data().uid !== user.uid
        ) {
          throw new Error("USERNAME_TAKEN");
        }

        const previousUsername = profileSnapshot.exists()
          ? String(profileSnapshot.data().username)
          : "";

        if (!usernameSnapshot.exists()) {
          /*
           * Carry the login email onto the new username document, or
           * logging in with the new username would stop working — the
           * signed-out login page resolves username to email through
           * here and nowhere else. Only for accounts with a password;
           * Google-only accounts keep their address private.
           */
          transaction.set(usernameReference, {
            uid: user.uid,
            ...(user.email &&
            user.providerData.some(
              (provider) => provider.providerId === "password",
            )
              ? { email: user.email }
              : {}),
          });
        }

        if (
          previousUsername &&
          previousUsername !== normalizedUsername
        ) {
          const previousUsernameReference = doc(
            db,
            "usernames",
            previousUsername,
          );

          transaction.delete(previousUsernameReference);
        }

        transaction.set(profileReference, {
          username: normalizedUsername,
          photoURL: user.photoURL ?? "",
          // A full set, so the stored email has to be carried over or
          // renaming yourself would erase it from the Mod dashboard.
          ...(profileSnapshot.exists() &&
          typeof profileSnapshot.data().email === "string"
            ? { email: profileSnapshot.data().email }
            : user.email
              ? { email: user.email }
              : {}),
          createdAt: profileSnapshot.exists()
            ? profileSnapshot.data().createdAt
            : serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });

      setUsername(normalizedUsername);
      setSavedUsername(normalizedUsername);
      setMessage("Profile saved successfully.");
    } catch (error) {
      console.error("Could not save profile:", error);

      if (
        error instanceof Error &&
        error.message === "USERNAME_TAKEN"
      ) {
        setErrorMessage(
          "That username is already taken. Try another one.",
        );
      } else {
        setErrorMessage(
          "Could not save your profile. Please try again.",
        );
      }
    } finally {
      setSaving(false);
    }
  };

  /*
   * Google-only accounts can gain a password without becoming a second
   * account: linkWithCredential attaches an email/password credential to
   * the existing user, so the uid, tokens, reading history and
   * leaderboard entry all carry over untouched. Afterwards they can sign
   * in either way.
   */
  const handleSetPassword = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!user?.email) {
      return;
    }

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setPasswordError(
        `Use at least ${MIN_PASSWORD_LENGTH} characters.`,
      );
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setPasswordError("The two passwords do not match.");
      return;
    }

    setSavingPassword(true);
    setPasswordError("");
    setPasswordMessage("");

    try {
      if (hasPassword) {
        // Firebase requires a recent login before a password change, so
        // prove the current one first.
        await reauthenticateWithCredential(
          user,
          EmailAuthProvider.credential(
            user.email,
            currentPassword,
          ),
        );

        await updatePassword(user, newPassword);

        setPasswordMessage("Your password has been changed.");
      } else {
        await linkWithCredential(
          user,
          EmailAuthProvider.credential(
            user.email,
            newPassword,
          ),
        );

        setPasswordMessage(
          "Password set. You can now log in with your email or username as well as with Google.",
        );
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (error) {
      console.error("Could not save the password:", error);
      setPasswordError(describeAuthError(error));
    } finally {
      setSavingPassword(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/");
    } catch (error) {
      console.error("Could not log out:", error);
      setErrorMessage(
        "Could not log out. Please try again.",
      );
    }
  };

  if (loading || loadingProfile) {
    return (
      <AccountPageLayout>
        <p className="text-muted-foreground">
          Loading profile...
        </p>
      </AccountPageLayout>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <AccountPageLayout>
      <section className="w-full max-w-lg rounded-2xl border border-border bg-card p-8 shadow-lg">
        <div className="text-center">
          {user.photoURL ? (
            <img
              src={user.photoURL}
              alt="Your profile"
              className="mx-auto h-24 w-24 rounded-full border border-border object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border border-border bg-muted">
              <UserRound className="h-12 w-12 text-muted-foreground" />
            </div>
          )}

          <h1 className="mt-5 text-3xl font-bold">
            Your profile
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            Your Google account picture is being used.
          </p>

          {savedUsername && (
            <p className="mt-2 font-medium text-primary">
              @{savedUsername}
            </p>
          )}

          <p className="mt-1 text-sm text-muted-foreground">
            {user.email}
          </p>

          <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-border bg-muted px-4 py-2">
            <Coins className="h-5 w-5 text-primary" />

            <span className="font-semibold">
              {tokens}{" "}
              {tokens === 1 ? "token" : "tokens"}
            </span>
          </div>
        </div>

        {/* Username and password are both "how you sign in", so they sit
            in one card as peers rather than as two unrelated blocks. */}
        <div className="mt-8 rounded-xl border border-border bg-muted/20 p-6">
          <div className="flex items-center gap-3">
            <UserCog className="h-5 w-5 text-primary" />

            <h2 className="text-lg font-semibold">
              Account settings
            </h2>
          </div>

          <form
            onSubmit={handleSave}
            className="mt-6 space-y-4"
          >
            <label className="block">
              <span className="mb-2 block text-sm font-medium">
                Username
              </span>

              <div className="flex items-center rounded-lg border border-input bg-background px-3">
                <span className="text-muted-foreground">
                  @
                </span>

                <input
                  type="text"
                  value={username}
                  onChange={handleUsernameChange}
                  minLength={3}
                  maxLength={20}
                  autoComplete="username"
                  placeholder="sciencefan"
                  className="w-full bg-transparent px-1 py-3 outline-none"
                />
              </div>
            </label>

            <p className="text-xs text-muted-foreground">
              Use 3–20 lowercase letters, numbers, or
              underscores.
            </p>

            {message && (
              <p
                role="status"
                className="text-sm text-green-700"
              >
                {message}
              </p>
            )}

            {errorMessage && (
              <p
                role="alert"
                className="text-sm text-destructive"
              >
                {errorMessage}
              </p>
            )}

            <Button
              type="submit"
              disabled={saving}
              className="w-full"
            >
              {saving
                ? "Saving..."
                : "Save username"}
            </Button>
          </form>

          <div className="mt-6 border-t border-border pt-6">
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-primary" />

              <h3 className="text-sm font-medium">
                {hasPassword ? "Password" : "Set a password"}
              </h3>
            </div>

            <p className="mt-2 text-sm text-muted-foreground">
              {hasPassword
                ? "You can log in with your email or username and this password."
                : "You signed in with Google. Set a password and you can also log in with your email or username — same account, same tokens."}
            </p>

            <form onSubmit={handleSetPassword} className="mt-4">
              {hasPassword && (
                <label className="block">
                  <span className="mb-2 block text-sm font-medium">
                    Current password
                  </span>

                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(event) =>
                      setCurrentPassword(event.target.value)
                    }
                    autoComplete="current-password"
                    required
                    className="w-full rounded-lg border border-input bg-background px-3 py-3"
                  />
                </label>
              )}

              <label className="mt-4 block">
                <span className="mb-2 block text-sm font-medium">
                  {hasPassword ? "New password" : "Password"}
                </span>

                <input
                  type="password"
                  value={newPassword}
                  onChange={(event) =>
                    setNewPassword(event.target.value)
                  }
                  autoComplete="new-password"
                  required
                  className="w-full rounded-lg border border-input bg-background px-3 py-3"
                />
              </label>

              <label className="mt-4 block">
                <span className="mb-2 block text-sm font-medium">
                  Confirm password
                </span>

                <input
                  type="password"
                  value={confirmNewPassword}
                  onChange={(event) =>
                    setConfirmNewPassword(event.target.value)
                  }
                  autoComplete="new-password"
                  required
                  className="w-full rounded-lg border border-input bg-background px-3 py-3"
                />
              </label>

              <Button
                type="submit"
                variant="neuron"
                disabled={savingPassword}
                className="mt-4 w-full"
              >
                {savingPassword
                  ? "Saving..."
                  : hasPassword
                    ? "Change password"
                    : "Set password"}
              </Button>
            </form>

            {passwordMessage && (
              <p
                className="mt-3 text-sm text-green-600"
                role="status"
              >
                {passwordMessage}
              </p>
            )}

            {passwordError && (
              <p
                className="mt-3 text-sm text-destructive"
                role="alert"
              >
                {passwordError}
              </p>
            )}
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={handleLogout}
          className="mt-8 w-full"
        >
          Log out
        </Button>

        <Button
          type="button"
          variant="ghost"
          onClick={() => navigate("/")}
          className="mt-2 w-full"
        >
          Return home
        </Button>
      </section>
    </AccountPageLayout>
  );
};

export default Profile;