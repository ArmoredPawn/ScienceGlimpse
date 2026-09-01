import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import {
  Coins,
  RefreshCw,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import Navigation from "../components/Navigation";
import { Button } from "../components/ui/button";
import { db } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";

interface UserSummary {
  uid: string;
  username: string;
  photoURL: string;
  automaticTokens: number;
  adjustments: number;
  gameTokens: number;
  balance: number;
  completedArticles: number;
}

const Mod = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [isModerator, setIsModerator] =
    useState<boolean | null>(null);

  const [users, setUsers] = useState<UserSummary[]>([]);
  const [selectedUid, setSelectedUid] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");

  const [loadingUsers, setLoadingUsers] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user) {
      navigate("/login", { replace: true });
      return;
    }

    let cancelled = false;

    const checkModerator = async () => {
      try {
        const moderatorSnapshot = await getDoc(
          doc(db, "moderators", user.uid),
        );

        if (!cancelled) {
          setIsModerator(moderatorSnapshot.exists());
        }
      } catch (error) {
        console.error(
          "Could not verify moderator access:",
          error,
        );

        if (!cancelled) {
          setIsModerator(false);
          setErrorMessage(
            "Moderator access could not be verified.",
          );
        }
      }
    };

    void checkModerator();

    return () => {
      cancelled = true;
    };
  }, [authLoading, navigate, user]);

  const loadUsers = useCallback(async () => {
    if (!isModerator) {
      return;
    }

    setLoadingUsers(true);
    setErrorMessage("");

    try {
      const usersSnapshot = await getDocs(
        collection(db, "users"),
      );

      const summaries = await Promise.all(
        usersSnapshot.docs.map(async (userDocument) => {
          const profile = userDocument.data();

          const [
            ledgerSnapshot,
            adjustmentSnapshot,
            gameLedgerSnapshot,
          ] = await Promise.all([
            getDocs(
              collection(
                db,
                "users",
                userDocument.id,
                "tokenLedger",
              ),
            ),
            getDocs(
              collection(
                db,
                "users",
                userDocument.id,
                "tokenAdjustments",
              ),
            ),
            getDocs(
              collection(
                db,
                "users",
                userDocument.id,
                "gameLedger",
              ),
            ),
          ]);

          const automaticTokens =
            ledgerSnapshot.docs.reduce(
              (total, rewardDocument) => {
                const rewardAmount =
                  rewardDocument.data().amount;

                return total +
                  (typeof rewardAmount === "number"
                    ? rewardAmount
                    : 0);
              },
              0,
            );

          const adjustments =
            adjustmentSnapshot.docs.reduce(
              (total, adjustmentDocument) => {
                const adjustmentAmount =
                  adjustmentDocument.data().amount;

                return total +
                  (typeof adjustmentAmount === "number"
                    ? adjustmentAmount
                    : 0);
              },
              0,
            );

          const gameTokens =
            gameLedgerSnapshot.docs.reduce(
              (total, gameDocument) => {
                const gameAmount =
                  gameDocument.data().amount;

                return total +
                  (typeof gameAmount === "number"
                    ? gameAmount
                    : 0);
              },
              0,
            );

          return {
            uid: userDocument.id,
            username:
              typeof profile.username === "string"
                ? profile.username
                : "No username",
            photoURL:
              typeof profile.photoURL === "string"
                ? profile.photoURL
                : "",
            automaticTokens,
            adjustments,
            gameTokens,
            balance: Math.max(
              0,
              automaticTokens + adjustments + gameTokens,
            ),
            completedArticles: ledgerSnapshot.size,
          };
        }),
      );

      summaries.sort(
        (firstUser, secondUser) =>
          secondUser.balance - firstUser.balance,
      );

      setUsers(summaries);

      setSelectedUid((currentUid) => {
        const currentStillExists = summaries.some(
          (currentUser) =>
            currentUser.uid === currentUid,
        );

        if (currentStillExists) {
          return currentUid;
        }

        return summaries[0]?.uid ?? "";
      });
    } catch (error) {
      console.error("Could not load users:", error);

      setErrorMessage(
        "Could not load user token information.",
      );
    } finally {
      setLoadingUsers(false);
    }
  }, [isModerator]);

  useEffect(() => {
    if (isModerator) {
      void loadUsers();
    }
  }, [isModerator, loadUsers]);

  const selectedUser = users.find(
    (currentUser) => currentUser.uid === selectedUid,
  );

  const handleAdjustment = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!user || !selectedUser) {
      return;
    }

    const parsedAmount = Number(amount);
    const cleanReason = reason.trim();

    if (
      !Number.isInteger(parsedAmount) ||
      parsedAmount === 0 ||
      parsedAmount < -1000 ||
      parsedAmount > 1000
    ) {
      setErrorMessage(
        "Enter a whole number between -1000 and 1000, excluding zero.",
      );
      return;
    }

    if (cleanReason.length < 3) {
      setErrorMessage(
        "Enter a reason containing at least 3 characters.",
      );
      return;
    }

    if (
      parsedAmount < 0 &&
      selectedUser.balance + parsedAmount < 0
    ) {
      setErrorMessage(
        `You cannot remove more than ${selectedUser.balance} tokens from this user.`,
      );
      return;
    }

    setSaving(true);
    setMessage("");
    setErrorMessage("");

    try {
      await addDoc(
        collection(
          db,
          "users",
          selectedUser.uid,
          "tokenAdjustments",
        ),
        {
          amount: parsedAmount,
          reason: cleanReason,
          moderatorUid: user.uid,
          createdAt: serverTimestamp(),
        },
      );

      setAmount("");
      setReason("");

      setMessage(
        `${parsedAmount > 0 ? "Added" : "Removed"} ${Math.abs(
          parsedAmount,
        )} tokens ${
          parsedAmount > 0 ? "to" : "from"
        } @${selectedUser.username}.`,
      );

      await loadUsers();
    } catch (error) {
      console.error(
        "Could not save token adjustment:",
        error,
      );

      setErrorMessage(
        "The token adjustment could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || isModerator === null) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">
          Verifying moderator access...
        </p>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  if (!isModerator) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
        <ShieldCheck className="h-12 w-12 text-muted-foreground" />

        <h1 className="mt-4 text-2xl font-bold">
          Access denied
        </h1>

        <p className="mt-2 text-muted-foreground">
          This page is restricted to ScienceGlimpse
          moderators.
        </p>

        <Button
          type="button"
          onClick={() => navigate("/")}
          className="mt-6"
        >
          Return home
        </Button>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="mx-auto max-w-6xl px-4 pb-16 pt-24">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-7 w-7 text-primary" />

              <h1 className="text-3xl font-bold">
                Moderator dashboard
              </h1>
            </div>

            <p className="mt-2 text-muted-foreground">
              View balances and create audited token
              adjustments.
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={() => void loadUsers()}
            disabled={loadingUsers}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${
                loadingUsers ? "animate-spin" : ""
              }`}
            />

            Refresh
          </Button>
        </div>

        <section className="mt-8 rounded-2xl border border-border bg-card p-6">
          <h2 className="text-xl font-semibold">
            Adjust tokens
          </h2>

          {users.length === 0 ? (
            <p className="mt-4 text-muted-foreground">
              No saved user profiles were found.
            </p>
          ) : (
            <form
              onSubmit={handleAdjustment}
              className="mt-5 grid gap-4"
            >
              <label>
                <span className="mb-2 block text-sm font-medium">
                  User
                </span>

                <select
                  value={selectedUid}
                  onChange={(event) => {
                    setSelectedUid(event.target.value);
                    setMessage("");
                    setErrorMessage("");
                  }}
                  className="w-full rounded-lg border border-input bg-background px-3 py-3"
                >
                  {users.map((currentUser) => (
                    <option
                      key={currentUser.uid}
                      value={currentUser.uid}
                    >
                      @{currentUser.username} —{" "}
                      {currentUser.balance} tokens
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span className="mb-2 block text-sm font-medium">
                  Amount
                </span>

                <input
                  type="number"
                  step="1"
                  min="-1000"
                  max="1000"
                  value={amount}
                  onChange={(event) =>
                    setAmount(event.target.value)
                  }
                  placeholder="Use 10 to add or -10 to remove"
                  required
                  className="w-full rounded-lg border border-input bg-background px-3 py-3"
                />
              </label>

              <label>
                <span className="mb-2 block text-sm font-medium">
                  Reason
                </span>

                <input
                  type="text"
                  value={reason}
                  onChange={(event) =>
                    setReason(event.target.value)
                  }
                  minLength={3}
                  maxLength={200}
                  placeholder="Example: Event participation"
                  required
                  className="w-full rounded-lg border border-input bg-background px-3 py-3"
                />
              </label>

              {selectedUser && (
                <p className="text-sm text-muted-foreground">
                  Current balance:{" "}
                  <strong>{selectedUser.balance}</strong>{" "}
                  tokens
                </p>
              )}

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
                className="w-full sm:w-fit"
              >
                {saving
                  ? "Saving..."
                  : "Save token adjustment"}
              </Button>
            </form>
          )}
        </section>

        <section className="mt-8 overflow-hidden rounded-2xl border border-border bg-card">
          <div className="border-b border-border p-6">
            <h2 className="text-xl font-semibold">
              User balances
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead className="bg-muted/50 text-sm">
                <tr>
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">
                    Article tokens
                  </th>
                  <th className="px-6 py-4">
                    Adjustments
                  </th>
                  <th className="px-6 py-4">
                    Game tokens
                  </th>
                  <th className="px-6 py-4">
                    Total
                  </th>
                  <th className="px-6 py-4">
                    Articles
                  </th>
                  <th className="px-6 py-4" />
                </tr>
              </thead>

              <tbody>
                {users.map((currentUser) => (
                  <tr
                    key={currentUser.uid}
                    className="border-t border-border"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {currentUser.photoURL ? (
                          <img
                            src={currentUser.photoURL}
                            alt=""
                            className="h-10 w-10 rounded-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                            <UserRound className="h-5 w-5" />
                          </div>
                        )}

                        <div>
                          <p className="font-medium">
                            @{currentUser.username}
                          </p>

                          <p className="max-w-48 truncate text-xs text-muted-foreground">
                            {currentUser.uid}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      {currentUser.automaticTokens}
                    </td>

                    <td className="px-6 py-4">
                      {currentUser.adjustments > 0
                        ? `+${currentUser.adjustments}`
                        : currentUser.adjustments}
                    </td>

                    <td className="px-6 py-4">
                      {currentUser.gameTokens > 0
                        ? `+${currentUser.gameTokens}`
                        : currentUser.gameTokens}
                    </td>

                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 font-semibold">
                        <Coins className="h-4 w-4 text-primary" />
                        {currentUser.balance}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      {currentUser.completedArticles}
                    </td>

                    <td className="px-6 py-4">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedUid(currentUser.uid);
                          window.scrollTo({
                            top: 0,
                            behavior: "smooth",
                          });
                        }}
                      >
                        Adjust
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Mod;