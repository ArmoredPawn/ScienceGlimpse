import { useState, type FormEvent } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { Link, useNavigate } from "react-router-dom";
import { MailCheck } from "lucide-react";

import AccountPageLayout from "../components/AccountPageLayout";
import { auth } from "../lib/firebase";
import {
  describeAuthError,
  looksLikeEmail,
  lookupUsernameEmail,
} from "../lib/auth";

const ForgotPassword = () => {
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    const trimmed = identifier.trim();

    if (!trimmed) {
      setErrorMessage("Enter your email or username.");
      return;
    }

    setSending(true);
    setErrorMessage("");

    try {
      let email = trimmed;

      if (!looksLikeEmail(trimmed)) {
        const lookup = await lookupUsernameEmail(trimmed);

        if (lookup.unknown || !lookup.email) {
          /*
           * Deliberately vague. Saying "no such account" here would turn
           * this form into a way of testing which usernames and emails
           * are registered.
           */
          setSent(true);
          return;
        }

        email = lookup.email;
      }

      await sendPasswordResetEmail(auth, email);

      setSent(true);
    } catch (error) {
      console.error("Password reset failed:", error);
      setErrorMessage(describeAuthError(error));
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <AccountPageLayout>
        <section className="w-full max-w-md rounded-2xl border bg-background p-8 text-center shadow-lg">
          <MailCheck className="mx-auto h-12 w-12 text-primary" />

          <h1 className="mt-4 text-2xl font-bold">
            Check your email
          </h1>

          <p className="mt-3 text-muted-foreground">
            If an account exists for that email or username, we have sent
            it a link to choose a new password. The link expires after an
            hour.
          </p>

          <p className="mt-3 text-sm text-muted-foreground">
            Nothing arrived? Check your spam folder, and make sure you
            used the address your account was created with.
          </p>

          <Link
            to="/login"
            className="mt-6 block w-full rounded-lg bg-primary px-4 py-3 font-semibold text-primary-foreground"
          >
            Back to log in
          </Link>
        </section>
      </AccountPageLayout>
    );
  }

  return (
    <AccountPageLayout>
      <section className="w-full max-w-md rounded-2xl border bg-background p-8 shadow-lg">
        <h1 className="text-center text-3xl font-bold">
          Reset your password
        </h1>

        <p className="mt-3 text-center text-muted-foreground">
          We will email you a link to choose a new one.
        </p>

        <form onSubmit={handleSubmit} className="mt-8">
          <label className="block">
            <span className="mb-2 block text-sm font-medium">
              Email or username
            </span>

            <input
              type="text"
              value={identifier}
              onChange={(event) =>
                setIdentifier(event.target.value)
              }
              autoComplete="username"
              placeholder="you@example.com or your_username"
              className="w-full rounded-lg border border-input bg-background px-3 py-3"
            />
          </label>

          <button
            type="submit"
            disabled={sending}
            className="mt-6 w-full rounded-lg bg-primary px-4 py-3 font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sending ? "Sending..." : "Send reset link"}
          </button>
        </form>

        {errorMessage && (
          <p className="mt-4 text-sm text-red-600" role="alert">
            {errorMessage}
          </p>
        )}

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Signed up with Google? You do not need a password — use{" "}
          <Link
            to="/login"
            className="font-semibold text-primary hover:underline"
          >
            Continue with Google
          </Link>
          .
        </p>

        <button
          type="button"
          onClick={() => navigate("/login")}
          className="mt-4 w-full rounded-lg px-4 py-3 font-semibold text-primary hover:underline"
        >
          Back to log in
        </button>
      </section>
    </AccountPageLayout>
  );
};

export default ForgotPassword;
