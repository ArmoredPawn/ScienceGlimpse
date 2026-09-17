import {
  useEffect,
  useState,
  type FormEvent,
} from "react";
import {
  createUserWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import { Link, useNavigate } from "react-router-dom";
import { Check, Coins, Loader2, X } from "lucide-react";

import AccountPageLayout from "../components/AccountPageLayout";
import { auth, googleProvider } from "../lib/firebase";
import {
  setPreferredUsername,
  useAuth,
  SIGNUP_BONUS_TOKENS,
} from "../context/AuthContext";
import {
  applyPersistence,
  describeAuthError,
  isUsernameTaken,
  MIN_PASSWORD_LENGTH,
  USERNAME_PATTERN,
} from "../lib/auth";

type UsernameState =
  | "empty"
  | "invalid"
  | "checking"
  | "available"
  | "taken"
  | "error";

const Signup = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);

  const [usernameState, setUsernameState] =
    useState<UsernameState>("empty");

  const [signingUp, setSigningUp] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const normalizedUsername = username.trim().toLowerCase();

  // Somebody already signed in has no business on this page.
  useEffect(() => {
    if (!loading && user) {
      navigate("/profile", { replace: true });
    }
  }, [loading, navigate, user]);

  /*
   * Availability check, debounced so a lookup does not fire on every
   * keystroke. The cancelled flag stops a slow earlier response from
   * overwriting the verdict for what is now a different username.
   */
  useEffect(() => {
    if (!normalizedUsername) {
      setUsernameState("empty");
      return;
    }

    if (!USERNAME_PATTERN.test(normalizedUsername)) {
      setUsernameState("invalid");
      return;
    }

    setUsernameState("checking");

    let cancelled = false;

    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const taken = await isUsernameTaken(
            normalizedUsername,
          );

          if (!cancelled) {
            setUsernameState(taken ? "taken" : "available");
          }
        } catch (error) {
          console.error(
            "Could not check that username:",
            error,
          );

          if (!cancelled) {
            setUsernameState("error");
          }
        }
      })();
    }, 400);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [normalizedUsername]);

  const passwordsMatch =
    password.length > 0 && password === confirmPassword;

  const passwordLongEnough =
    password.length >= MIN_PASSWORD_LENGTH;

  const canSubmit =
    !signingUp &&
    email.trim().length > 0 &&
    usernameState === "available" &&
    passwordLongEnough &&
    passwordsMatch;

  const handleSignup = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!canSubmit) {
      return;
    }

    setSigningUp(true);
    setErrorMessage("");

    try {
      await applyPersistence(rememberMe);

      /*
       * Claim the chosen username before the account exists. Creating the
       * account signs the user straight in, and AuthContext reacts to
       * that by building their profile — this is what tells it which
       * username to use instead of deriving one from the email.
       */
      setPreferredUsername(normalizedUsername);

      await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password,
      );

      navigate("/profile");
    } catch (error) {
      console.error("Sign-up failed:", error);

      setPreferredUsername(null);
      setErrorMessage(describeAuthError(error));
    } finally {
      setSigningUp(false);
    }
  };

  const handleGoogleSignup = async () => {
    setSigningUp(true);
    setErrorMessage("");

    try {
      await applyPersistence(rememberMe);
      await signInWithPopup(auth, googleProvider);

      navigate("/");
    } catch (error) {
      console.error("Google sign-up failed:", error);
      setErrorMessage(describeAuthError(error));
    } finally {
      setSigningUp(false);
    }
  };

  const usernameHint = () => {
    switch (usernameState) {
      case "invalid":
        return {
          tone: "text-red-600",
          text: "3–20 characters, using lowercase letters, numbers or underscores.",
          icon: <X className="h-4 w-4" />,
        };
      case "checking":
        return {
          tone: "text-muted-foreground",
          text: "Checking availability...",
          icon: <Loader2 className="h-4 w-4 animate-spin" />,
        };
      case "available":
        return {
          tone: "text-green-600",
          text: `@${normalizedUsername} is available.`,
          icon: <Check className="h-4 w-4" />,
        };
      case "taken":
        return {
          tone: "text-red-600",
          text: `@${normalizedUsername} is already taken.`,
          icon: <X className="h-4 w-4" />,
        };
      case "error":
        return {
          tone: "text-red-600",
          text: "Could not check that username. Try again.",
          icon: <X className="h-4 w-4" />,
        };
      default:
        return null;
    }
  };

  const hint = usernameHint();

  if (loading) {
    return (
      <AccountPageLayout>
        <p>Loading...</p>
      </AccountPageLayout>
    );
  }

  return (
    <AccountPageLayout>
      <section className="w-full max-w-md rounded-2xl border bg-background p-8 shadow-lg">
        <h1 className="text-center text-3xl font-bold">
          Join ScienceGlimpse
        </h1>

        <div className="mt-6 flex items-start gap-3 rounded-lg border border-border bg-muted/40 p-4">
          <Coins className="mt-0.5 h-5 w-5 shrink-0 text-primary" />

          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">
              Get {SIGNUP_BONUS_TOKENS} tokens
            </span>{" "}
            the moment you sign up — then earn 10 more for every article
            you read.
          </p>
        </div>

        <button
          type="button"
          onClick={handleGoogleSignup}
          disabled={signingUp}
          className="mt-6 w-full rounded-lg border border-input px-4 py-3 font-semibold hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
        >
          Sign up with Google
        </button>

        <div className="my-6 flex items-center gap-4">
          <span className="h-px flex-1 bg-border" />
          <span className="text-xs uppercase text-muted-foreground">
            or
          </span>
          <span className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={handleSignup}>
          <label className="block">
            <span className="mb-2 block text-sm font-medium">
              Email
            </span>

            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              placeholder="you@example.com"
              required
              className="w-full rounded-lg border border-input bg-background px-3 py-3"
            />
          </label>

          <label className="mt-4 block">
            <span className="mb-2 block text-sm font-medium">
              Username
            </span>

            <input
              type="text"
              value={username}
              onChange={(event) =>
                setUsername(event.target.value)
              }
              autoComplete="username"
              placeholder="your_username"
              required
              className="w-full rounded-lg border border-input bg-background px-3 py-3"
            />
          </label>

          {hint && (
            <p
              className={`mt-2 flex items-center gap-2 text-sm ${hint.tone}`}
              aria-live="polite"
            >
              {hint.icon}
              {hint.text}
            </p>
          )}

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
              autoComplete="new-password"
              required
              className="w-full rounded-lg border border-input bg-background px-3 py-3"
            />
          </label>

          {password.length > 0 && !passwordLongEnough && (
            <p className="mt-2 text-sm text-red-600">
              Use at least {MIN_PASSWORD_LENGTH} characters.
            </p>
          )}

          <label className="mt-4 block">
            <span className="mb-2 block text-sm font-medium">
              Confirm password
            </span>

            <input
              type="password"
              value={confirmPassword}
              onChange={(event) =>
                setConfirmPassword(event.target.value)
              }
              autoComplete="new-password"
              required
              className="w-full rounded-lg border border-input bg-background px-3 py-3"
            />
          </label>

          {confirmPassword.length > 0 && !passwordsMatch && (
            <p
              className="mt-2 flex items-center gap-2 text-sm text-red-600"
              aria-live="polite"
            >
              <X className="h-4 w-4" />
              Passwords do not match.
            </p>
          )}

          {passwordsMatch && passwordLongEnough && (
            <p
              className="mt-2 flex items-center gap-2 text-sm text-green-600"
              aria-live="polite"
            >
              <Check className="h-4 w-4" />
              Passwords match.
            </p>
          )}

          <label className="mt-4 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(event) =>
                setRememberMe(event.target.checked)
              }
              className="h-4 w-4 rounded border-input"
            />
            Remember me on this device
          </label>

          <button
            type="submit"
            disabled={!canSubmit}
            className="mt-6 w-full rounded-lg bg-primary px-4 py-3 font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            {signingUp ? "Creating account..." : "Create account"}
          </button>
        </form>

        {errorMessage && (
          <p className="mt-4 text-sm text-red-600" role="alert">
            {errorMessage}
          </p>
        )}

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            to="/login"
            className="font-semibold text-primary hover:underline"
          >
            Log in
          </Link>
        </p>
      </section>
    </AccountPageLayout>
  );
};

export default Signup;
