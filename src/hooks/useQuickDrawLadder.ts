import { useCallback, useEffect, useRef, useState } from "react";
import {
  collection,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
  type DocumentSnapshot,
} from "firebase/firestore";

import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import {
  QUICK_DRAW_LEADERBOARD,
  QUICK_DRAW_STAT_ID,
} from "@/lib/quickDraw";

export interface LadderRival {
  uid: string;
  username: string;
  bestTime: number;
}

export interface LadderPosition {
  /** 1-based, and ties share a rank. Null until the player has a time. */
  rank: number | null;
  /** How many players are on the ladder. */
  size: number;
  /**
   * The player to beat: the next-fastest time above this player's, or the
   * slowest player on the ladder for someone who isn't on it yet. Null for
   * the #1 player, and when the ladder is empty.
   */
  rival: LadderRival | null;
}

export interface DuelReport {
  /** This duel's average beat the player's previous best (or was their first). */
  newBest: boolean;
  /** False when a new best could not be saved, so nothing changed. */
  saved: boolean;
  previousBest: number | null;
  previousRank: number | null;
  /** Where the player stands after this duel. */
  position: LadderPosition;
}

const EMPTY_POSITION: LadderPosition = {
  rank: null,
  size: 0,
  rival: null,
};

function toRival(snapshot: DocumentSnapshot): LadderRival | null {
  const data = snapshot.data();

  if (
    !data ||
    typeof data.username !== "string" ||
    typeof data.bestTime !== "number"
  ) {
    return null;
  }

  return {
    uid: snapshot.id,
    username: data.username,
    bestTime: data.bestTime,
  };
}

async function loadPosition(
  userId: string,
  bestTime: number | null,
): Promise<LadderPosition> {
  const ladder = collection(db, QUICK_DRAW_LEADERBOARD);

  if (bestTime === null) {
    // Two, in case the slowest entry is somehow this player's own.
    const [sizeSnapshot, slowestSnapshot] = await Promise.all([
      getCountFromServer(ladder),
      getDocs(query(ladder, orderBy("bestTime", "desc"), limit(2))),
    ]);

    const rival =
      slowestSnapshot.docs
        .filter((entry) => entry.id !== userId)
        .map(toRival)
        .find((entry) => entry !== null) ?? null;

    return {
      rank: null,
      size: sizeSnapshot.data().count,
      rival,
    };
  }

  const faster = query(ladder, where("bestTime", "<", bestTime));

  const [sizeSnapshot, fasterSnapshot, rivalSnapshot] =
    await Promise.all([
      getCountFromServer(ladder),
      getCountFromServer(faster),
      getDocs(query(faster, orderBy("bestTime", "desc"), limit(1))),
    ]);

  const rank = fasterSnapshot.data().count + 1;

  return {
    rank,
    // A best that never reached the board (no username yet) still ranks.
    size: Math.max(sizeSnapshot.data().count, rank),
    rival:
      rivalSnapshot.docs.length > 0
        ? toRival(rivalSnapshot.docs[0])
        : null,
  };
}

/**
 * A signed-in player's place on the ScienceGlimpse Quick Draw Ladder: their
 * best average reaction time (users/{uid}/gameStats/quickDraw), their rank,
 * and the rival directly above them. The ladder itself is the public
 * quickDrawLeaderboard collection, kept in step with gameStats exactly the
 * way useBestAltitude keeps Summit's leaderboard in step.
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

      const nextPosition = await loadPosition(userId, best);

      if (cancelled) {
        return;
      }

      bestRef.current = best;
      positionRef.current = nextPosition;

      setBestTime(best);
      setPosition(nextPosition);
    };

    void loadLadder()
      .catch((error) => {
        console.error("Could not load the Quick Draw ladder:", error);

        if (!cancelled) {
          setErrorMessage("The ladder could not be loaded right now.");
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
   * gameStats and the public ladder together, then the player's rank and
   * next rival are reloaded either way.
   */
  const reportDuel = useCallback(
    async (averageTime: number): Promise<DuelReport> => {
      const previousBest = bestRef.current;
      const previousRank = positionRef.current.rank;

      const newBest = previousBest === null || averageTime < previousBest;

      let saved = true;

      if (userId && newBest) {
        const statsReference = doc(
          db,
          "users",
          userId,
          "gameStats",
          QUICK_DRAW_STAT_ID,
        );

        const username = usernameRef.current;

        try {
          if (username) {
            const batch = writeBatch(db);

            batch.set(statsReference, {
              bestTime: averageTime,
              updatedAt: serverTimestamp(),
            });

            batch.set(doc(db, QUICK_DRAW_LEADERBOARD, userId), {
              username,
              bestTime: averageTime,
              updatedAt: serverTimestamp(),
            });

            await batch.commit();
          } else {
            // No username to publish under yet. Keep the record; the sync
            // on a later visit puts it on the board.
            await setDoc(statsReference, {
              bestTime: averageTime,
              updatedAt: serverTimestamp(),
            });
          }
        } catch (error) {
          console.error("Could not save the Quick Draw time:", error);
          saved = false;
        }
      }

      const best = newBest && saved ? averageTime : previousBest;

      bestRef.current = best;
      setBestTime(best);

      let nextPosition = positionRef.current;

      if (userId) {
        try {
          nextPosition = await loadPosition(userId, best);

          positionRef.current = nextPosition;
          setPosition(nextPosition);
        } catch (error) {
          console.error("Could not reload the Quick Draw ladder:", error);
        }
      }

      return {
        newBest,
        saved,
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
    rival: position.rival,
    reportDuel,
  };
}
