import { useCallback, useEffect, useRef, useState } from "react";
import { doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";

import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";

const LOCAL_STORAGE_KEY = "sg-science-summit-best";

function readLocalBest(): number {
  try {
    return Number(localStorage.getItem(LOCAL_STORAGE_KEY) || 0);
  } catch {
    return 0;
  }
}

function writeLocalBest(value: number): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, String(value));
  } catch {
    // Ignore localStorage errors.
  }
}

/**
 * Best Science Summit altitude, scoped to the signed-in account (via
 * Firestore) rather than the device — otherwise switching accounts on
 * the same browser would show whichever account last set the record,
 * not each player's own best. Signed-out play falls back to a
 * per-device localStorage record, since there's no account to scope it to.
 */
export function useBestAltitude() {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.uid ?? null;

  const [bestAltitude, setBestAltitude] = useState(0);

  const bestRef = useRef(0);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    /*
     * Reset before loading this scope's value. Without this, switching
     * accounts (or signing out) could briefly keep showing the
     * previous account's higher best, since the snapshot handler below
     * only ever moves the displayed value up, never down.
     */
    bestRef.current = 0;
    setBestAltitude(0);

    if (!userId) {
      const localBest = readLocalBest();

      bestRef.current = localBest;
      setBestAltitude(localBest);

      return;
    }

    const unsubscribe = onSnapshot(
      doc(db, "users", userId, "gameStats", "scienceSummit"),
      (snapshot) => {
        const stored = snapshot.exists()
          ? snapshot.data().bestAltitude
          : 0;

        const value = typeof stored === "number" ? stored : 0;

        bestRef.current = Math.max(bestRef.current, value);
        setBestAltitude(bestRef.current);
      },
      (error) => {
        console.error("Could not load best altitude:", error);
      },
    );

    return unsubscribe;
  }, [authLoading, userId]);

  const reportAltitude = useCallback(
    (altitude: number) => {
      if (altitude <= bestRef.current) {
        return;
      }

      bestRef.current = altitude;
      setBestAltitude(altitude);

      if (!userId) {
        writeLocalBest(altitude);
        return;
      }

      void setDoc(doc(db, "users", userId, "gameStats", "scienceSummit"), {
        bestAltitude: altitude,
        updatedAt: serverTimestamp(),
      }).catch((error) => {
        console.error("Could not save best altitude:", error);
      });
    },
    [userId],
  );

  return { bestAltitude, reportAltitude };
}
