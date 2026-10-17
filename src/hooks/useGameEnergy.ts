import { useCallback, useEffect, useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";

import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import {
  TOKENS_PER_CHARGE,
  subscribeToTokenBalance,
  type GameChargeType,
} from "@/lib/tokens";

/**
 * Ties a game's spending to a signed-in player's real ScienceGlimpse token
 * balance. Each spendToken() writes a fixed -1 entry to
 * users/{uid}/gameLedger, validated by firestore.rules the same way the
 * article-reading reward is validated. ScienceGlimpse Summit spends one for
 * every JUMPS_PER_TOKEN jumps; ScienceGlimpse Quick Draw Ladder spends one
 * per duel.
 *
 * spendToken resolves true once Firestore has accepted the spend, for a
 * game that needs the token paid before it starts.
 */
export function useGameEnergy(
  chargeType: GameChargeType = "game_jump_batch",
) {
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

  const spendToken = useCallback((): Promise<boolean> => {
    if (!userId) {
      return Promise.resolve(false);
    }

    return addDoc(collection(db, "users", userId, "gameLedger"), {
      amount: -TOKENS_PER_CHARGE,
      type: chargeType,
      createdAt: serverTimestamp(),
    })
      .then(() => true)
      .catch((error) => {
        console.error("Could not record token spend:", error);
        return false;
      });
  }, [chargeType, userId]);

  return {
    signedIn: Boolean(userId),
    balance,
    spendToken,
  };
}
