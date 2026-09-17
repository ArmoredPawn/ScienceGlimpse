import { useState, type FormEvent } from "react";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import { Link, useNavigate } from "react-router-dom";
import { Coins } from "lucide-react";

import { auth, googleProvider } from "../lib/firebase";
import {
  useAuth,
  SIGNUP_BONUS_TOKENS,
} from "../context/AuthContext";
import {
  applyPersistence,
  describeAuthError,
  looksLikeEmail,
  lookupUsernameEmail,
} from "../lib/auth";

const Login = () => {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);

  const [signingIn, setSigningIn] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handlePasswordSignIn = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    const trimmedIdentifier = identifier.trim();

    if (!trimmedIdentifier || !password) {
      setErrorMessage(
        "Enter your email or username and your password.",
      );
      return;
    }

    setSigningIn(true);
    setErrorMessage("");

    try {
      await applyPersistence(rememberMe);

      let email = trimmedIdentifier;

      // Firebase can only sign in by email, so a username has to be
      // resolved to one first.
      if (!looksLikeEmail(trimmedIdentifier)) {
        const lookup = await lookupUsernameEmail(
          trimmedIdentifier,
        );

        if (lookup.unknown) {
          setErrorMessage(
            "No account found with that username.",
          );
          return;
        }

        if (lookup.googleOnly || !lookup.email) {
          setErrorMessage(
            "That account signs in with Google and has no password yet. Use Continue with Google below, then set a password on your profile.",
          );
          return;
        }

        email = lookup.email;
      }

      await signInWithEmailAndPassword(auth, email, password);

      navigate("/");
    } catch (error) {
      console.error("Sign-in failed:", error);
      setErrorMessage(describeAuthError(error));
    } finally {
      setSigningIn(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setSigningIn(true);
    setErrorMessage("");

    try {
      await applyPersistence(rememberMe);
      await signInWithPopup(auth, googleProvider);

      navigate("/");
    } catch (error) {
      console.error("Google sign-in failed:", error);
      setErrorMessage(describeAuthError(error));
    } finally {
      setSigningIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout failed:", error);
      setErrorMessage("Could not log out. Please try again.");
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p>Loading...</p>
      </main>
    );
  }

  if (user) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <section className="w-full max-w-md rounded-2xl border bg-background p-8 text-center shadow-lg">
          {user.photoURL && (
            <img
              src={user.photoURL}
              alt=""
              className="mx-auto mb-4 h-20 w-20 rounded-full"
              referrerPolicy="no-referrer"
            />
          )}

          <h1 className="text-2xl font-bold">
            Welcome, {user.displayName || "ScienceGlimpse user"}!
          </h1>

          <p className="mt-2 text-muted-foreground">
            {user.email}
          </p>

          <button
            type="button"
            onClick={() => navigate("/profile")}
            className="mt-6 w-full rounded-lg bg-primary px-4 py-3 font-semibold text-primary-foreground"
          >
            Go to profile
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="mt-3 w-full rounded-lg border px-4 py-3 font-semibold hover:bg-muted"
          >
            Log out
          </button>

          <button
            type="button"
            onClick={() => navigate("/")}
            className="mt-3 w-full rounded-lg px-4 py-3 font-semibold text-primary hover:underline"
          >
            Return home
          </button>

          {errorMessage && (
            <p className="mt-4 text-sm text-red-600" role="alert">
              {errorMessage}
            </p>
          )}
        </section>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <section className="w-full max-w-md rounded-2xl border bg-background p-8 shadow-lg">
        <h1 className="text-center text-3xl font-bold">
          Log in to ScienceGlimpse
        </h1>

        <p className="mt-3 text-center text-muted-foreground">
          Welcome back — pick up where you left off.
        </p>

        <form onSubmit={handlePasswordSignIn} className="mt-8">
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

          <label className="mt-4 block">
            <span className="mb-2 block text-sm font-medium">
              Password
            </span>

            <input
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              autoComplete="current-password"
              className="w-full rounded-lg border border-input bg-background px-3 py-3"
            />
          </label>

          <div className="mt-4 flex items-center justify-between gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(event) =>
                  setRememberMe(event.target.checked)
                }
                className="h-4 w-4 rounded border-input"
              />
              Remember me
            </label>

            <Link
              to="/forgot-password"
              className="text-sm font-medium text-primary hover:underline"
            >
              Forgot password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={signingIn}
            className="mt-6 w-full rounded-lg bg-primary px-4 py-3 font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            {signingIn ? "Logging in..." : "Log in"}
          </button>
        </form>

        <div className="my-6 flex items-center gap-4">
          <span className="h-px flex-1 bg-border" />
          <span className="text-xs uppercase text-muted-foreground">
            or
          </span>
          <span className="h-px flex-1 bg-border" />
        </div>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={signingIn}
          className="w-full rounded-lg border border-input px-4 py-3 font-semibold hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
        >
          Continue with Google
        </button>

        {errorMessage && (
          <p className="mt-4 text-sm text-red-600" role="alert">
            {errorMessage}
          </p>
        )}

        <div className="mt-8 rounded-lg border border-border bg-muted/40 p-4">
          <div className="flex items-start gap-3">
            <Coins className="mt-0.5 h-5 w-5 shrink-0 text-primary" />

            <p className="text-sm text-muted-foreground">
              New here?{" "}
              <Link
                to="/signup"
                className="font-semibold text-primary hover:underline"
              >
                Create an account
              </Link>{" "}
              and get {SIGNUP_BONUS_TOKENS} tokens to start climbing in
              Science Summit.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate("/")}
          className="mt-4 w-full rounded-lg px-4 py-3 font-semibold text-primary hover:underline"
        >
          Return home
        </button>
      </section>
    </main>
  );
};

export default Login;
