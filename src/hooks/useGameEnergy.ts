import { useCallback, useEffect, useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";

import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import {
  TOKENS_PER_CHARGE,
  subscribeToTokenBalance,
} from "@/lib/tokens";

/**
 * Ties Science Summit's in-game "energy" to a signed-in player's real
 * ScienceGlimpse token balance. Every JUMPS_PER_TOKEN jumps writes a
 * fixed -1 entry to users/{uid}/gameLedger, validated by firestore.rules
 * the same way the article-reading reward is validated.
 */
export function useGameEnergy() {
  const { user } = useAuth();
  const userId = user?.uid ?? null;

  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    if (!userId) {
      setBalance(null);
      return;
    }

    setBalance(null);

    const unsubscribe = subscribeToTokenBalance(
      userId,
      (value) => setBalance(value),
      (error) => {
        console.error("Could not load token balance:", error);
      },
    );

    return unsubscribe;
  }, [userId]);

  const spendToken = useCallback(() => {
    if (!userId) {
      return;
    }

    void addDoc(collection(db, "users", userId, "gameLedger"), {
      amount: -TOKENS_PER_CHARGE,
      type: "game_jump_batch",
      createdAt: serverTimestamp(),
    }).catch((error) => {
      console.error("Could not record token spend:", error);
    });
  }, [userId]);

  return {
    signedIn: Boolean(userId),
    balance,
    spendToken,
  };
}
