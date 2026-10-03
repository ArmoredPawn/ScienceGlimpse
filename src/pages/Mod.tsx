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
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  writeBatch,
  type Timestamp,
} from "firebase/firestore";
import {
  Ban,
  Coins,
  Mountain,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  Trophy,
  UserRound,
  Users,
} from "lucide-react";

import Navigation from "../components/Navigation";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "../components/ui/sheet";
import { toast } from "../components/ui/sonner";
import { db } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";

interface SuspensionSummary {
  reason: string;
  moderatorUid: string;
  createdAt: Date | null;
}

interface UserSummary {
  uid: string;
  username: string;
  /**
   * The stored username only when it's actually valid to publish
   * (firestore.rules validUsername) — null when the profile has none.
   */
  publishableUsername: string | null;
  /**
   * Copied onto the profile by AuthContext at sign-in. Empty for an
   * account that has not signed in since that started, since Firebase
   * Authentication emails are unreadable from the client.
   */
  email: string;
  photoURL: string;
  automaticTokens: number;
  adjustments: number;
  gameTokens: number;
  balance: number;
  completedArticles: number;
  bestAltitude: number;
  /** suspensions/{uid}, or null for an account in good standing. */
  suspension: SuspensionSummary | null;
}

type StatusFilter = "all" | "active" | "suspended";

const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
];

const sumAmounts = (
  documents: { data: () => Record<string, unknown> }[],
): number =>
  documents.reduce((total, current) => {
    const value = current.data().amount;

    return total + (typeof value === "number" ? value : 0);
  }, 0);

const formatSigned = (value: number): string =>
  value > 0 ? `+${value}` : String(value);

const Avatar = ({ user }: { user: UserSummary }) =>
  user.photoURL ? (
    <img
      src={user.photoURL}
      alt=""
      className="h-10 w-10 shrink-0 rounded-full object-cover"
      referrerPolicy="no-referrer"
    />
  ) : (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
      <UserRound className="h-5 w-5" />
    </div>
  );

const StatusBadge = ({ user }: { user: UserSummary }) =>
  user.suspension ? (
    <Badge variant="destructive">Suspended</Badge>
  ) : (
    <Badge variant="secondary">Active</Badge>
  );

const Mod = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [isModerator, setIsModerator] =
    useState<boolean | null>(null);

  const [users, setUsers] = useState<UserSummary[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("all");
  const [syncing, setSyncing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // The user open in the side panel, and that panel's forms.
  const [selectedUid, setSelectedUid] = useState<string | null>(
    null,
  );
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [suspendReason, setSuspendReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);

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
      const [usersSnapshot, suspensionsSnapshot] =
        await Promise.all([
          getDocs(collection(db, "users")),
          getDocs(collection(db, "suspensions")),
        ]);

      const suspensions = new Map<string, SuspensionSummary>(
        suspensionsSnapshot.docs.map((suspensionDocument) => {
          const data = suspensionDocument.data();
          const createdAt = data.createdAt as
            | Timestamp
            | undefined;

          return [
            suspensionDocument.id,
            {
              reason:
                typeof data.reason === "string"
                  ? data.reason
                  : "",
              moderatorUid:
                typeof data.moderatorUid === "string"
                  ? data.moderatorUid
                  : "",
              createdAt: createdAt?.toDate?.() ?? null,
            },
          ];
        }),
      );

      const summaries = await Promise.all(
        usersSnapshot.docs.map(
          async (userDocument): Promise<UserSummary> => {
            const profile = userDocument.data();
            const uid = userDocument.id;

            const [
              ledgerSnapshot,
              adjustmentSnapshot,
              gameLedgerSnapshot,
              gameStatsSnapshot,
            ] = await Promise.all([
              getDocs(
                collection(db, "users", uid, "tokenLedger"),
              ),
              getDocs(
                collection(
                  db,
                  "users",
                  uid,
                  "tokenAdjustments",
                ),
              ),
              getDocs(
                collection(db, "users", uid, "gameLedger"),
              ),
              getDoc(
                doc(
                  db,
                  "users",
                  uid,
                  "gameStats",
                  "scienceSummit",
                ),
              ),
            ]);

            const automaticTokens = sumAmounts(
              ledgerSnapshot.docs,
            );
            const adjustments = sumAmounts(
              adjustmentSnapshot.docs,
            );
            const gameTokens = sumAmounts(
              gameLedgerSnapshot.docs,
            );

            const storedAltitude = gameStatsSnapshot.exists()
              ? gameStatsSnapshot.data().bestAltitude
              : 0;

            const storedUsername =
              typeof profile.username === "string"
                ? profile.username
                : null;

            return {
              uid,
              username: storedUsername ?? "No username",
              publishableUsername:
                storedUsername !== null &&
                USERNAME_PATTERN.test(storedUsername)
                  ? storedUsername
                  : null,
              email:
                typeof profile.email === "string"
                  ? profile.email
                  : "",
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
              completedArticles: ledgerSnapshot.docs.filter(
                (entry) =>
                  entry.data().type === "article_read",
              ).length,
              bestAltitude:
                typeof storedAltitude === "number"
                  ? storedAltitude
                  : 0,
              suspension: suspensions.get(uid) ?? null,
            };
          },
        ),
      );

      summaries.sort(
        (firstUser, secondUser) =>
          secondUser.balance - firstUser.balance,
      );

      setUsers(summaries);
    } catch (error) {
      console.error("Could not load users:", error);

      setErrorMessage(
        "Could not load user information. If you just added suspensions, check the latest firestore.rules are published.",
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

  /*
   * Matches email, username or uid, so one box covers "who is
   * alice@example.com" and "what is @alice up to" alike. Filtering is
   * done here rather than as a Firestore query because the dashboard
   * already holds every user in memory to total their ledgers, and a
   * query would need an index plus exact-match semantics.
   */
  const normalizedSearch = search.trim().toLowerCase();

  const filteredUsers = users.filter((currentUser) => {
    if (
      statusFilter === "active" && currentUser.suspension
    ) {
      return false;
    }

    if (
      statusFilter === "suspended" && !currentUser.suspension
    ) {
      return false;
    }

    return (
      !normalizedSearch ||
      [
        currentUser.email,
        currentUser.username,
        currentUser.uid,
      ].some((field) =>
        field.toLowerCase().includes(normalizedSearch),
      )
    );
  });

  const suspendedCount = users.filter(
    (currentUser) => currentUser.suspension,
  ).length;

  const tokensInCirculation = users.reduce(
    (total, currentUser) => total + currentUser.balance,
    0,
  );

  const selectedUser =
    users.find((currentUser) => currentUser.uid === selectedUid) ??
    null;

  const usernameOf = (uid: string): string => {
    const match = users.find(
      (currentUser) => currentUser.uid === uid,
    );

    return match ? `@${match.username}` : "a moderator";
  };

  const openUser = (uid: string) => {
    setSelectedUid(uid);
    setAmount("");
    setReason("");
    setSuspendReason("");
  };

  /*
   * Publish every player's recorded altitude to the public leaderboard.
   * Records set before the leaderboard collection existed were never
   * published (a player only publishes their own on a new best, or the
   * next time they open the game), so this backfills them in one go.
   * Firestore rules still check each altitude against the player's real
   * gameStats doc, so this can only publish genuine records — and refuse
   * a suspended player's, which is why those are left out here.
   */
  const handleLeaderboardSync = async () => {
    const publishable = users.filter(
      (currentUser) =>
        currentUser.publishableUsername !== null &&
        currentUser.bestAltitude > 0 &&
        !currentUser.suspension,
    );

    if (publishable.length === 0) {
      toast.error(
        "No active users have a recorded altitude and a valid username to publish.",
      );
      return;
    }

    setSyncing(true);

    try {
      const batch = writeBatch(db);

      for (const currentUser of publishable) {
        batch.set(doc(db, "leaderboard", currentUser.uid), {
          username: currentUser.publishableUsername,
          bestAltitude: currentUser.bestAltitude,
          updatedAt: serverTimestamp(),
        });
      }

      await batch.commit();

      toast.success(
        `Published ${publishable.length} ${
          publishable.length === 1 ? "climber" : "climbers"
        } to the leaderboard.`,
      );
    } catch (error) {
      console.error(
        "Could not sync the leaderboard:",
        error,
      );

      toast.error("The leaderboard could not be synced.");
    } finally {
      setSyncing(false);
    }
  };

  /*
   * Suspending writes suspensions/{uid}, which firestore.rules checks on
   * every write the player makes, and takes them off the public
   * leaderboard in the same batch so the two never disagree.
   */
  const handleSuspend = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!user || !selectedUser) {
      return;
    }

    const cleanReason = suspendReason.trim();

    if (cleanReason.length < 3) {
      toast.error(
        "Enter a reason containing at least 3 characters.",
      );
      return;
    }

    setChangingStatus(true);

    try {
      const batch = writeBatch(db);

      batch.set(doc(db, "suspensions", selectedUser.uid), {
        reason: cleanReason,
        moderatorUid: user.uid,
        createdAt: serverTimestamp(),
      });

      batch.delete(doc(db, "leaderboard", selectedUser.uid));

      await batch.commit();

      setSuspendReason("");
      toast.success(`Suspended @${selectedUser.username}.`);

      await loadUsers();
    } catch (error) {
      console.error("Could not suspend user:", error);

      toast.error(
        "The account could not be suspended. Check the latest firestore.rules are published.",
      );
    } finally {
      setChangingStatus(false);
    }
  };

  /*
   * Restoring deletes the suspension, then puts the player's best climb
   * back on the leaderboard. That second write has to come after the
   * first: the leaderboard rule refuses entries for a player who is
   * still suspended.
   */
  const handleRestore = async () => {
    if (!selectedUser) {
      return;
    }

    setChangingStatus(true);

    try {
      await deleteDoc(doc(db, "suspensions", selectedUser.uid));
    } catch (error) {
      console.error("Could not restore user:", error);

      toast.error("The account could not be restored.");
      setChangingStatus(false);
      return;
    }

    if (
      selectedUser.publishableUsername !== null &&
      selectedUser.bestAltitude > 0
    ) {
      try {
        await setDoc(doc(db, "leaderboard", selectedUser.uid), {
          username: selectedUser.publishableUsername,
          bestAltitude: selectedUser.bestAltitude,
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        console.error(
          "Could not republish leaderboard entry:",
          error,
        );

        toast.error(
          "Restored, but their leaderboard entry could not be republished. Use Sync leaderboard to retry.",
        );
      }
    }

    toast.success(`Restored @${selectedUser.username}.`);
    setChangingStatus(false);

    await loadUsers();
  };

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
      toast.error(
        "Enter a whole number between -1000 and 1000, excluding zero.",
      );
      return;
    }

    if (cleanReason.length < 3) {
      toast.error(
        "Enter a reason containing at least 3 characters.",
      );
      return;
    }

    if (
      parsedAmount < 0 &&
      selectedUser.balance + parsedAmount < 0
    ) {
      toast.error(
        `You cannot remove more than ${selectedUser.balance} tokens from this user.`,
      );
      return;
    }

    setSaving(true);

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

      toast.success(
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

      toast.error("The token adjustment could not be saved.");
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

  const isSelf = selectedUser?.uid === user.uid;

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
              Manage accounts, suspensions and token balances.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleLeaderboardSync()}
              disabled={syncing || loadingUsers || users.length === 0}
            >
              <Trophy className="mr-2 h-4 w-4" />

              {syncing
                ? "Syncing..."
                : "Sync leaderboard"}
            </Button>

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
        </div>

        {errorMessage && (
          <p
            role="alert"
            className="mt-6 text-sm text-destructive"
          >
            {errorMessage}
          </p>
        )}

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              Accounts
            </p>
            <p className="mt-2 text-3xl font-bold">
              {users.length}
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              setStatusFilter(
                statusFilter === "suspended"
                  ? "all"
                  : "suspended",
              )
            }
            className="rounded-2xl border border-border bg-card p-5 text-left transition-colors hover:bg-muted/50"
          >
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Ban className="h-4 w-4" />
              Suspended
            </p>
            <p
              className={`mt-2 text-3xl font-bold ${
                suspendedCount > 0 ? "text-destructive" : ""
              }`}
            >
              {suspendedCount}
            </p>
          </button>

          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Coins className="h-4 w-4" />
              Tokens in circulation
            </p>
            <p className="mt-2 text-3xl font-bold">
              {tokensInCirculation.toLocaleString()}
            </p>
          </div>
        </div>

        <section className="mt-8 overflow-hidden rounded-2xl border border-border bg-card">
          <div className="flex flex-col gap-4 border-b border-border p-6 md:flex-row md:items-center">
            <label className="block flex-1">
              <span className="sr-only">
                Search users by email, username or UID
              </span>

              <span className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                <input
                  type="search"
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Search by email, username or UID"
                  className="w-full rounded-lg border border-input bg-background py-3 pl-10 pr-3"
                />
              </span>
            </label>

            <div
              role="group"
              aria-label="Filter by status"
              className="inline-flex rounded-lg border border-input p-1"
            >
              {STATUS_FILTERS.map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => setStatusFilter(filter.value)}
                  aria-pressed={statusFilter === filter.value}
                  className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                    statusFilter === filter.value
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left">
              <thead className="bg-muted/50 text-sm">
                <tr>
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Tokens</th>
                  <th className="px-6 py-4">Articles</th>
                  <th className="px-6 py-4">Best climb</th>
                  <th className="px-6 py-4">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredUsers.map((currentUser) => (
                  <tr
                    key={currentUser.uid}
                    onClick={() => openUser(currentUser.uid)}
                    className="cursor-pointer border-t border-border transition-colors hover:bg-muted/40"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar user={currentUser} />

                        <div className="min-w-0">
                          <p className="font-medium">
                            @{currentUser.username}
                          </p>

                          <p
                            className="max-w-64 truncate text-xs text-muted-foreground"
                            title={
                              currentUser.email
                                ? undefined
                                : "Email is recorded the next time this account signs in"
                            }
                          >
                            {currentUser.email || currentUser.uid}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <StatusBadge user={currentUser} />
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
                      {currentUser.bestAltitude > 0 ? (
                        <span className="inline-flex items-center gap-1">
                          <Mountain className="h-4 w-4 text-muted-foreground" />
                          {currentUser.bestAltitude.toLocaleString()} m
                        </span>
                      ) : (
                        <span className="text-muted-foreground">
                          —
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={(event) => {
                          event.stopPropagation();
                          openUser(currentUser.uid);
                        }}
                      >
                        Manage
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {!loadingUsers && filteredUsers.length === 0 && (
              <p className="px-6 py-10 text-center text-muted-foreground">
                {users.length === 0
                  ? "No saved user profiles were found."
                  : "No users match these filters."}
              </p>
            )}
          </div>
        </section>
      </main>

      <Sheet
        open={selectedUser !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedUid(null);
          }
        }}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          {selectedUser && (
            <>
              <SheetHeader className="text-left">
                <div className="flex items-center gap-3">
                  <Avatar user={selectedUser} />

                  <div className="min-w-0">
                    <SheetTitle className="truncate">
                      @{selectedUser.username}
                    </SheetTitle>

                    <SheetDescription className="truncate">
                      {selectedUser.email || "No email recorded"}
                    </SheetDescription>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <StatusBadge user={selectedUser} />

                  <span className="truncate text-xs text-muted-foreground">
                    {selectedUser.uid}
                  </span>
                </div>
              </SheetHeader>

              <section className="mt-6">
                <h3 className="text-sm font-semibold">
                  Balance
                </h3>

                <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg bg-muted/50 p-3">
                    <dt className="text-muted-foreground">
                      Earned
                    </dt>
                    <dd className="font-semibold">
                      {selectedUser.automaticTokens}
                    </dd>
                  </div>

                  <div className="rounded-lg bg-muted/50 p-3">
                    <dt className="text-muted-foreground">
                      Adjustments
                    </dt>
                    <dd className="font-semibold">
                      {formatSigned(selectedUser.adjustments)}
                    </dd>
                  </div>

                  <div className="rounded-lg bg-muted/50 p-3">
                    <dt className="text-muted-foreground">
                      Spent in game
                    </dt>
                    <dd className="font-semibold">
                      {formatSigned(selectedUser.gameTokens)}
                    </dd>
                  </div>

                  <div className="rounded-lg bg-muted/50 p-3">
                    <dt className="text-muted-foreground">
                      Total
                    </dt>
                    <dd className="inline-flex items-center gap-1 font-semibold">
                      <Coins className="h-4 w-4 text-primary" />
                      {selectedUser.balance}
                    </dd>
                  </div>
                </dl>
              </section>

              <section className="mt-8 border-t border-border pt-6">
                <h3 className="text-sm font-semibold">
                  Account status
                </h3>

                {selectedUser.suspension ? (
                  <div className="mt-3">
                    <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm">
                      <p className="font-medium text-destructive">
                        Suspended
                        {selectedUser.suspension.createdAt &&
                          ` on ${selectedUser.suspension.createdAt.toLocaleDateString()}`}{" "}
                        by{" "}
                        {usernameOf(
                          selectedUser.suspension.moderatorUid,
                        )}
                      </p>

                      {selectedUser.suspension.reason && (
                        <p className="mt-2">
                          {selectedUser.suspension.reason}
                        </p>
                      )}
                    </div>

                    <Button
                      type="button"
                      onClick={() => void handleRestore()}
                      disabled={changingStatus}
                      className="mt-4 w-full"
                    >
                      <RotateCcw className="mr-2 h-4 w-4" />

                      {changingStatus
                        ? "Restoring..."
                        : "Restore account"}
                    </Button>
                  </div>
                ) : isSelf ? (
                  <p className="mt-3 text-sm text-muted-foreground">
                    You can't suspend your own account.
                  </p>
                ) : (
                  <form
                    onSubmit={handleSuspend}
                    className="mt-3 grid gap-3"
                  >
                    <p className="text-sm text-muted-foreground">
                      They'll see the reason below and won't be
                      able to earn tokens, play or edit their
                      profile until restored. Their leaderboard
                      entry is hidden meanwhile.
                    </p>

                    <label>
                      <span className="mb-2 block text-sm font-medium">
                        Reason
                      </span>

                      <input
                        type="text"
                        value={suspendReason}
                        onChange={(event) =>
                          setSuspendReason(event.target.value)
                        }
                        minLength={3}
                        maxLength={200}
                        placeholder="Example: Abusive username"
                        required
                        className="w-full rounded-lg border border-input bg-background px-3 py-3"
                      />
                    </label>

                    <Button
                      type="submit"
                      variant="destructive"
                      disabled={changingStatus}
                    >
                      <Ban className="mr-2 h-4 w-4" />

                      {changingStatus
                        ? "Suspending..."
                        : "Suspend account"}
                    </Button>
                  </form>
                )}
              </section>

              <section className="mt-8 border-t border-border pt-6">
                <h3 className="text-sm font-semibold">
                  Adjust tokens
                </h3>

                <form
                  onSubmit={handleAdjustment}
                  className="mt-3 grid gap-3"
                >
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

                  <Button
                    type="submit"
                    variant="outline"
                    disabled={saving}
                  >
                    {saving
                      ? "Saving..."
                      : "Save token adjustment"}
                  </Button>
                </form>
              </section>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default Mod;
