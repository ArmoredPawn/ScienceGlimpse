import { useCallback, useEffect, useRef, useState } from "react";
import {
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

import { db } from "@/lib/firebase";

export interface SavedRun {
  altitude: number;
  checkpointX: number;
  checkpointY: number;
  maxHeight: number;
}

/**
 * An in-progress Science Summit climb, saved so a signed-in player can
 * pause, close the tab, and pick the same run back up later instead of
 * restarting from the ground — earning more tokens (by reading articles)
 * in between and coming back with them. Cleared the moment a run
 * actually ends (lava or falling out of tokens), so any saved doc means
 * "still climbing." See firestore.rules for the write validation.
 */
export function useSavedRun(userId: string | null) {
  const [savedRun, setSavedRun] = useState<SavedRun | null>(null);
  const [loading, setLoading] = useState(true);

  const runRef = useRef<ReturnType<typeof doc> | null>(null);

  useEffect(() => {
    if (!userId) {
      setSavedRun(null);
      setLoading(false);
      runRef.current = null;
      return;
    }

    const reference = doc(db, "users", userId, "gameRuns", "current");
    runRef.current = reference;

    let cancelled = false;
    setLoading(true);

    void getDoc(reference)
      .then((snapshot) => {
        if (cancelled) {
          return;
        }

        if (!snapshot.exists()) {
          setSavedRun(null);
          return;
        }

        const data = snapshot.data();

        const altitude = data.altitude;
        const checkpointX = data.checkpointX;
        const checkpointY = data.checkpointY;
        const maxHeight = data.maxHeight;

        if (
          typeof altitude === "number" &&
          typeof checkpointX === "number" &&
          typeof checkpointY === "number" &&
          typeof maxHeight === "number"
        ) {
          setSavedRun({ altitude, checkpointX, checkpointY, maxHeight });
        } else {
          setSavedRun(null);
        }
      })
      .catch((error) => {
        console.error("Could not load saved climb:", error);
        setSavedRun(null);
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const saveRun = useCallback((run: SavedRun) => {
    const reference = runRef.current;

    if (!reference) {
      return;
    }

    void setDoc(reference, {
      altitude: Math.max(0, Math.floor(run.altitude)),
      checkpointX: run.checkpointX,
      checkpointY: run.checkpointY,
      maxHeight: Math.max(0, Math.floor(run.maxHeight)),
      updatedAt: serverTimestamp(),
    }).catch((error) => {
      console.error("Could not save your climb:", error);
    });
  }, []);

  const clearRun = useCallback(() => {
    const reference = runRef.current;

    if (!reference) {
      return;
    }

    setSavedRun(null);

    void deleteDoc(reference).catch((error) => {
      console.error("Could not clear saved climb:", error);
    });
  }, []);

  return { savedRun, loading, saveRun, clearRun };
}
