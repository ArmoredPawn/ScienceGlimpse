import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { doc, getDoc, Timestamp } from "firebase/firestore";
import {
  AtSign,
  BadgeCheck,
  Coins,
  KeyRound,
  LogOut,
  Mail,
  UserRound,
  type LucideIcon,
} from "lucide-react";

import AccountPageLayout from "../components/AccountPageLayout";
import ChangePasswordDialog from "../components/ChangePasswordDialog";
import ChangeUsernameDialog from "../components/ChangeUsernameDialog";
import { db } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/button";
import { toast } from "../components/ui/sonner";
import { subscribeToTokenBalance } from "../lib/tokens";
import { describeAuthError } from "../lib/auth";

interface StoredProfile {
  username: string;
  photoURL: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

interface AccountRowProps {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  action?: ReactNode;
}

/*
 * One line of the settings list: what it is, its current value, and the
 * button that changes it. The editing itself happens in a dialog, so the
 * page stays a summary rather than a stack of open forms.
 */
const AccountRow = ({
  icon: Icon,
  label,
  value,
  action,
}: AccountRowProps) => (
  <li className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:gap-4">
    <div className="flex min-w-0 flex-1 items-center gap-4">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
        <Icon className="h-4 w-4 text-primary" />
      </span>

      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>

        <div className="truncate text-sm text-muted-foreground">
          {value}
        </div>
      </div>
    </div>

    {action && <div className="sm:shrink-0">{action}</div>}
  </li>
);

const Profile = () => {
  const {
    user,
    loading,
    logout,
    emailVerified,
    sendVerificationEmail,
  } = useAuth();
  const navigate = useNavigate();

  const [savedUsername, setSavedUsername] = useState("");
  const [memberSince, setMemberSince] = useState<Date | null>(
    null,
  );
  const [tokens, setTokens] = useState(0);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [sendingVerification, setSendingVerification] =
    useState(false);

  /*
   * Linking a password mutates user.providerData in place, which doesn't
   * re-render anything, so remember it here to flip the row straight away.
   */
  const [passwordJustSet, setPasswordJustSet] = useState(false);

  const hasPassword =
    passwordJustSet ||
    Boolean(
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

          setSavedUsername(profile.username);
          setMemberSince(
            profile.createdAt instanceof Timestamp
              ? profile.createdAt.toDate()
              : null,
          );
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

  const handleSendVerification = async () => {
    setSendingVerification(true);

    try {
      await sendVerificationEmail();
      toast.success(
        `Verification link sent to ${user?.email ?? "your email"}.`,
      );
    } catch (error) {
      console.error("Could not send the verification email:", error);
      toast.error(describeAuthError(error));
    } finally {
      setSendingVerification(false);
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
      <div className="w-full max-w-2xl space-y-6">
        <section className="rounded-2xl border border-border bg-card p-6 shadow-lg sm:p-8">
          <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:text-left">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt="Your profile"
                className="h-20 w-20 shrink-0 rounded-full border border-border object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border border-border bg-muted">
                <UserRound className="h-10 w-10 text-muted-foreground" />
              </div>
            )}

            <div className="min-w-0 flex-1">
              <h1 className="truncate text-2xl font-bold sm:text-3xl">
                {savedUsername ? `@${savedUsername}` : "Your profile"}
              </h1>

              <p className="mt-1 truncate text-sm text-muted-foreground">
                {user.email}
              </p>

              {memberSince && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Member since{" "}
                  {memberSince.toLocaleDateString(undefined, {
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              )}
            </div>

            <Link
              to="/tokens"
              className="inline-flex shrink-0 items-center gap-2 rounded-full border border-border bg-muted px-4 py-2 transition-colors hover:bg-accent hover:text-accent-foreground"
              title="How to earn tokens"
            >
              <Coins className="h-5 w-5 text-primary" />

              <span className="font-semibold">
                {tokens}{" "}
                {tokens === 1 ? "token" : "tokens"}
              </span>
            </Link>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card shadow-lg">
          <h2 className="px-6 pb-2 pt-6 text-lg font-semibold">
            Account settings
          </h2>

          <ul className="divide-y divide-border">
            <AccountRow
              icon={AtSign}
              label="Username"
              value={savedUsername ? `@${savedUsername}` : "Not set"}
              action={
                <ChangeUsernameDialog
                  currentUsername={savedUsername}
                  onSaved={setSavedUsername}
                />
              }
            />

            <AccountRow
              icon={Mail}
              label="Email"
              value={
                <span className="flex min-w-0 items-center gap-2">
                  <span className="truncate">{user.email}</span>

                  {emailVerified && (
                    <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-primary">
                      <BadgeCheck className="h-3.5 w-3.5" />
                      Verified
                    </span>
                  )}
                </span>
              }
              action={
                !emailVerified && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSendVerification}
                    disabled={sendingVerification}
                    className="w-full sm:w-auto"
                  >
                    {sendingVerification
                      ? "Sending..."
                      : "Verify email"}
                  </Button>
                )
              }
            />

            <AccountRow
              icon={KeyRound}
              label="Password"
              value={
                hasPassword
                  ? "••••••••"
                  : "Not set — you sign in with Google"
              }
              action={
                <ChangePasswordDialog
                  hasPassword={hasPassword}
                  onPasswordSet={() => setPasswordJustSet(true)}
                />
              }
            />
          </ul>
        </section>

        {errorMessage && (
          <p
            role="alert"
            className="text-center text-sm text-destructive"
          >
            {errorMessage}
          </p>
        )}

        <div className="flex justify-center">
          <Button
            type="button"
            variant="outline"
            onClick={handleLogout}
            className="w-full sm:w-auto"
          >
            <LogOut />
            Log out
          </Button>
        </div>
      </div>
    </AccountPageLayout>
  );
};

export default Profile;
