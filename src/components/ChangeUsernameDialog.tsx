import { useState, type ChangeEvent, type FormEvent } from "react";
import {
  doc,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";
import { USERNAME_PATTERN } from "../lib/auth";
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
import { Label } from "./ui/label";
import { toast } from "./ui/sonner";

interface ChangeUsernameDialogProps {
  currentUsername: string;
  /** Called with the new name once it has been claimed. */
  onSaved: (username: string) => void;
}

const ChangeUsernameDialog = ({
  currentUsername,
  onSaved,
}: ChangeUsernameDialogProps) => {
  const { user } = useAuth();

  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState(currentUsername);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleOpenChange = (nextOpen: boolean) => {
    // Closing mid-transaction would hide whether the rename went through.
    if (saving) {
      return;
    }

    if (nextOpen) {
      setUsername(currentUsername);
      setErrorMessage("");
    }

    setOpen(nextOpen);
  };

  const handleUsernameChange = (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const normalizedValue = event.target.value
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "");

    setUsername(normalizedValue);
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
          // renaming yourself would erase it from the Admin dashboard.
          ...(profileSnapshot.exists() &&
          typeof profileSnapshot.data().email === "string"
            ? { email: profileSnapshot.data().email }
            : user.email
              ? { email: user.email }
              : {}),
          lastSeenAt: serverTimestamp(),
          createdAt: profileSnapshot.exists()
            ? profileSnapshot.data().createdAt
            : serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });

      onSaved(normalizedUsername);
      setOpen(false);
      toast.success(`Your username is now @${normalizedUsername}.`);
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
          "Could not save your username. Please try again.",
        );
      }
    } finally {
      setSaving(false);
    }
  };

  const unchanged = username === currentUsername;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full sm:w-auto"
        >
          Change username
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change username</DialogTitle>
          <DialogDescription>
            Your username shows on the leaderboard, and you can
            log in with it instead of your email.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-username">New username</Label>

            <div className="flex items-center rounded-md border border-input bg-background px-3 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 ring-offset-background">
              <span className="text-muted-foreground">@</span>

              <input
                id="new-username"
                type="text"
                value={username}
                onChange={handleUsernameChange}
                minLength={3}
                maxLength={20}
                autoComplete="username"
                placeholder="sciencefan"
                autoFocus
                className="h-10 w-full bg-transparent px-1 text-base outline-none md:text-sm"
              />
            </div>

            <p className="text-xs text-muted-foreground">
              3–20 lowercase letters, numbers, or underscores.
            </p>
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

            <Button
              type="submit"
              disabled={saving || unchanged}
            >
              {saving ? "Saving..." : "Save username"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ChangeUsernameDialog;
