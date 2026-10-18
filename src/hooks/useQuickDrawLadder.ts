import { useCallback, useEffect, useRef, useState } from "react";
import {
  collection,
  doc,
  getCountFromServer,
  getDoc,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  where,
  FirestoreError,
} from "firebase/firestore";

import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import {
  QUICK_DRAW_LEADERBOARD,
  QUICK_DRAW_STAT_ID,
} from "@/lib/quickDraw";

export interface LadderPosition {
  /** 1-based, and ties share a rank. Null until the player has a time. */
  rank: number | null;
  /** How many players are on the ladder. */
  size: number;
}

export interface DuelReport {
  /** This duel's average beat the player's previous best (or was their first). */
  newBest: boolean;
  /** False when a new best could not be saved, so nothing changed. */
  saved: boolean;
  /** The save failed because Firestore is over its usage quota. */
  overQuota: boolean;
  previousBest: number | null;
  previousRank: number | null;
  /** Where the player stands after this duel. */
  position: LadderPosition;
}

/**
 * Firestore refuses every request once the project is over its usage
 * quota (on the free plan, until the daily reset at midnight Pacific).
 * Worth telling apart from a dropped connection.
 */
function isOverQuota(error: unknown) {
  return (
    error instanceof FirestoreError && error.code === "resource-exhausted"
  );
}

const EMPTY_POSITION: LadderPosition = {
  rank: null,
  size: 0,
};

async function loadPosition(
  bestTime: number | null,
): Promise<LadderPosition> {
  const ladder = collection(db, QUICK_DRAW_LEADERBOARD);

  if (bestTime === null) {
    const sizeSnapshot = await getCountFromServer(ladder);

    return {
      rank: null,
      size: sizeSnapshot.data().count,
    };
  }

  const [sizeSnapshot, fasterSnapshot] = await Promise.all([
    getCountFromServer(ladder),
    getCountFromServer(query(ladder, where("bestTime", "<", bestTime))),
  ]);

  const rank = fasterSnapshot.data().count + 1;

  return {
    rank,
    // A best that never reached the board (no username yet) still ranks.
    size: Math.max(sizeSnapshot.data().count, rank),
  };
}

/**
 * A signed-in player's place on the ScienceGlimpse Quick Draw Ladder: their
 * best average reaction time (users/{uid}/gameStats/quickDraw) and their
 * rank. The ladder itself is the public quickDrawLeaderboard collection,
 * kept in step with gameStats exactly the way useBestAltitude keeps
 * Summit's leaderboard in step.
 */
export function useQuickDrawLadder() {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.uid ?? null;

  const [bestTime, setBestTime] = useState<number | null>(null);
  const [position, setPosition] =
    useState<LadderPosition>(EMPTY_POSITION);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const bestRef = useRef<number | null>(null);
  const positionRef = useRef<LadderPosition>(EMPTY_POSITION);
  const usernameRef = useRef<string | null>(null);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    // Reset first, so switching accounts never shows the last one's ladder.
    bestRef.current = null;
    positionRef.current = EMPTY_POSITION;
    usernameRef.current = null;

    setBestTime(null);
    setPosition(EMPTY_POSITION);
    setErrorMessage("");

    if (!userId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const loadLadder = async () => {
      setLoading(true);

      const [profileSnapshot, statsSnapshot, entrySnapshot] =
        await Promise.all([
          getDoc(doc(db, "users", userId)),
          getDoc(
            doc(db, "users", userId, "gameStats", QUICK_DRAW_STAT_ID),
          ),
          getDoc(doc(db, QUICK_DRAW_LEADERBOARD, userId)),
        ]);

      const username = profileSnapshot.exists()
        ? profileSnapshot.data().username
        : null;

      usernameRef.current =
        typeof username === "string" ? username : null;

      const storedBest = statsSnapshot.exists()
        ? statsSnapshot.data().bestTime
        : null;

      const best = typeof storedBest === "number" ? storedBest : null;

      if (cancelled) {
        return;
      }

      // Known now, so the best shows even if the rank lookup below fails.
      bestRef.current = best;
      setBestTime(best);

      /*
       * Publish this account's record if the board is missing it or has
       * it under an old username. reportDuel only writes on a new best,
       * so without this a username change — or being restored after a
       * suspension — would leave the board out of date.
       */
      const entry = entrySnapshot.exists() ? entrySnapshot.data() : null;

      if (
        best !== null &&
        usernameRef.current !== null &&
        (entry === null ||
          entry.bestTime !== best ||
          entry.username !== usernameRef.current)
      ) {
        await setDoc(doc(db, QUICK_DRAW_LEADERBOARD, userId), {
          username: usernameRef.current,
          bestTime: best,
          updatedAt: serverTimestamp(),
        }).catch((error) => {
          console.error(
            "Could not sync the Quick Draw ladder entry:",
            error,
          );
        });
      }

      const nextPosition = await loadPosition(best);

      if (cancelled) {
        return;
      }

      positionRef.current = nextPosition;
      setPosition(nextPosition);
    };

    void loadLadder()
      .catch((error) => {
        console.error("Could not load the Quick Draw ladder:", error);

        if (!cancelled) {
          setErrorMessage(
            isOverQuota(error)
              ? "The leaderboard is over its daily limit. Try again later."
              : "The leaderboard could not be loaded right now.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [authLoading, userId]);

  /**
   * Records a finished duel's average time. A new best is saved to
   * gameStats and the public ladder together, then the player's rank is
   * reloaded either way.
   */
  const reportDuel = useCallback(
    async (averageTime: number): Promise<DuelReport> => {
      let previousBest = bestRef.current;
      const previousRank = positionRef.current.rank;

      let newBest = previousBest === null || averageTime < previousBest;

      let saved = true;
      let overQuota = false;

      // Slower than a best already loaded: there's nothing to save.
      if (userId && newBest) {
        const statsReference = doc(
          db,
          "users",
          userId,
          "gameStats",
          QUICK_DRAW_STAT_ID,
        );

        const username = usernameRef.current;

        /*
         * Compare against the stored best, not the one in memory: if the
         * ladder failed to load, bestRef is still null and every duel
         * would look like a first record, overwriting a faster one.
         */
        try {
          const storedBest = await runTransaction(db, async (transaction) => {
            const statsSnapshot = await transaction.get(statsReference);

            const stored = statsSnapshot.exists()
              ? statsSnapshot.data().bestTime
              : null;

            const best = typeof stored === "number" ? stored : null;

            if (best !== null && averageTime >= best) {
              return best;
            }

            transaction.set(statsReference, {
              bestTime: averageTime,
              updatedAt: serverTimestamp(),
            });

            // No username to publish under yet. Keep the record; the sync
            // on a later visit puts it on the board.
            if (username) {
              transaction.set(doc(db, QUICK_DRAW_LEADERBOARD, userId), {
                username,
                bestTime: averageTime,
                updatedAt: serverTimestamp(),
              });
            }

            return best;
          });

          previousBest = storedBest;
          newBest = storedBest === null || averageTime < storedBest;
        } catch (error) {
          console.error("Could not save the Quick Draw time:", error);
          saved = false;
          overQuota = isOverQuota(error);
        }
      }

      const best = newBest && saved ? averageTime : previousBest;

      bestRef.current = best;
      setBestTime(best);

      let nextPosition = positionRef.current;

      if (userId) {
        try {
          nextPosition = await loadPosition(best);

          positionRef.current = nextPosition;
          setPosition(nextPosition);
        } catch (error) {
          console.error("Could not reload the Quick Draw ladder:", error);
        }
      }

      return {
        newBest,
        saved,
        overQuota,
        previousBest,
        previousRank,
        position: nextPosition,
      };
    },
    [userId],
  );

  return {
    loading: authLoading || loading,
    errorMessage,
    bestTime,
    rank: position.rank,
    ladderSize: position.size,
    reportDuel,
  };
}
