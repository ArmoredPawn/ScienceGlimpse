import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  EmailAuthProvider,
  linkWithCredential,
  reauthenticateWithCredential,
  updatePassword,
} from "firebase/auth";

import { useAuth } from "../context/AuthContext";
import {
  describeAuthError,
  MIN_PASSWORD_LENGTH,
} from "../lib/auth";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { toast } from "./ui/sonner";

interface ChangePasswordDialogProps {
  /** False for a Google-only account, which sets a first password instead. */
  hasPassword: boolean;
  /** Called after a Google-only account links its first password. */
  onPasswordSet: () => void;
}

const ChangePasswordDialog = ({
  hasPassword,
  onPasswordSet,
}: ChangePasswordDialogProps) => {
  const { user } = useAuth();

  const [open, setOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] =
    useState("");
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleOpenChange = (nextOpen: boolean) => {
    if (saving) {
      return;
    }

    // Never leave typed passwords sitting in state between openings.
    setCurrentPassword("");
    setNewPassword("");
    setConfirmNewPassword("");
    setErrorMessage("");
    setOpen(nextOpen);
  };

  /*
   * Google-only accounts can gain a password without becoming a second
   * account: linkWithCredential attaches an email/password credential to
   * the existing user, so the uid, tokens, reading history and
   * leaderboard entry all carry over untouched. Afterwards they can sign
   * in either way.
   */
  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!user?.email) {
      return;
    }

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setErrorMessage(
        `Use at least ${MIN_PASSWORD_LENGTH} characters.`,
      );
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setErrorMessage("The two passwords do not match.");
      return;
    }

    setSaving(true);
    setErrorMessage("");

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

        toast.success("Your password has been changed.");
      } else {
        await linkWithCredential(
          user,
          EmailAuthProvider.credential(
            user.email,
            newPassword,
          ),
        );

        onPasswordSet();
        toast.success(
          "Password set. You can now log in with your email or username as well as with Google.",
        );
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setOpen(false);
    } catch (error) {
      console.error("Could not save the password:", error);
      setErrorMessage(describeAuthError(error));
    } finally {
      setSaving(false);
    }
  };

  const title = hasPassword ? "Change password" : "Set a password";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full sm:w-auto"
        >
          {hasPassword ? "Change password" : "Set password"}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {hasPassword
              ? "Enter your current password, then choose a new one."
              : "You signed in with Google. Set a password and you can also log in with your email or username — same account, same tokens."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {hasPassword && (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-4">
                <Label htmlFor="current-password">
                  Current password
                </Label>

                <Link
                  to="/forgot-password"
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Forgot it?
                </Link>
              </div>

              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(event) =>
                  setCurrentPassword(event.target.value)
                }
                autoComplete="current-password"
                autoFocus
                required
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="new-password">
              {hasPassword ? "New password" : "Password"}
            </Label>

            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(event) =>
                setNewPassword(event.target.value)
              }
              autoComplete="new-password"
              autoFocus={!hasPassword}
              required
            />

            <p className="text-xs text-muted-foreground">
              At least {MIN_PASSWORD_LENGTH} characters.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-new-password">
              Confirm password
            </Label>

            <Input
              id="confirm-new-password"
              type="password"
              value={confirmNewPassword}
              onChange={(event) =>
                setConfirmNewPassword(event.target.value)
              }
              autoComplete="new-password"
              required
            />
          </div>

          {errorMessage && (
            <p
              role="alert"
              className="text-sm text-destructive"
            >
              {errorMessage}
            </p>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="ghost"
              onClick={() => handleOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>

            <Button type="submit" disabled={saving}>
              {saving
                ? "Saving..."
                : hasPassword
                  ? "Change password"
                  : "Set password"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ChangePasswordDialog;
