import { useState } from "react";
import { FirebaseError } from "firebase/app";
import { signInWithPopup } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { Coins } from "lucide-react";

import { auth, googleProvider } from "../lib/firebase";
import { useAuth, SIGNUP_BONUS_TOKENS } from "../context/AuthContext";

const Login = () => {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();

  const [signingIn, setSigningIn] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleGoogleSignIn = async () => {
    setSigningIn(true);
    setErrorMessage("");

    try {
      await signInWithPopup(auth, googleProvider);
      navigate("/");
    } catch (error: unknown) {
      console.error("Google sign-in failed:", error);

      if (error instanceof FirebaseError) {
        if (error.code === "auth/popup-closed-by-user") {
          setErrorMessage("The sign-in window was closed.");
        } else if (error.code === "auth/popup-blocked") {
          setErrorMessage(
            "Your browser blocked the sign-in window. Please allow popups."
          );
        } else {
          setErrorMessage("Google sign-in failed. Please try again.");
        }
      } else {
        setErrorMessage("Google sign-in failed. Please try again.");
      }
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

          <p className="mt-2 text-muted-foreground">{user.email}</p>

          <button
            type="button"
            onClick={handleLogout}
            className="mt-6 w-full rounded-lg border px-4 py-3 font-semibold hover:bg-muted"
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
    <main className="flex min-h-screen items-center justify-center px-4">
      <section className="w-full max-w-md rounded-2xl border bg-background p-8 text-center shadow-lg">
        <h1 className="text-3xl font-bold">Log in to ScienceGlimpse</h1>

        <p className="mt-3 text-muted-foreground">
          Sign in to access your ScienceGlimpse account.
        </p>

        <div className="mt-6 flex items-center gap-3 rounded-lg border border-border bg-muted/40 p-4 text-left">
          <Coins className="h-6 w-6 shrink-0 text-primary" />

          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">
              Create an account and get {SIGNUP_BONUS_TOKENS} tokens
            </span>{" "}
            to start climbing in Science Summit — then earn more by
            reading articles.
          </p>
        </div>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={signingIn}
          className="mt-8 w-full rounded-lg bg-primary px-4 py-3 font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
        >
          {signingIn ? "Signing in..." : "Continue with Google"}
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
};

export default Login;