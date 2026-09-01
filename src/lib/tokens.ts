import { collection, onSnapshot, type QueryDocumentSnapshot } from "firebase/firestore";

import { db } from "./firebase";

/**
 * Science Summit spends tokens by jumping: every JUMPS_PER_TOKEN jumps
 * costs TOKENS_PER_CHARGE tokens. Mirrored exactly in firestore.rules
 * (users/{uid}/gameLedger create rule) — keep both in sync.
 */
export const JUMPS_PER_TOKEN = 10;
export const TOKENS_PER_CHARGE = 1;

function sumAmounts(docs: QueryDocumentSnapshot[]): number {
  return docs.reduce((total, currentDocument) => {
    const amount = currentDocument.data().amount;

    return total + (typeof amount === "number" ? amount : 0);
  }, 0);
}

/**
 * A user's real ScienceGlimpse token balance is the sum of every
 * append-only ledger a user can accrue tokens from: article-reading
 * rewards, moderator adjustments, and Science Summit game energy.
 * There is no single stored balance field on purpose (see firestore.rules).
 */
export function subscribeToTokenBalance(
  userId: string,
  onBalance: (balance: number) => void,
  onError?: (error: unknown) => void,
): () => void {
  let ledgerTotal = 0;
  let adjustmentTotal = 0;
  let gameTotal = 0;

  const emitBalance = () => {
    onBalance(Math.max(0, ledgerTotal + adjustmentTotal + gameTotal));
  };

  const unsubscribeLedger = onSnapshot(
    collection(db, "users", userId, "tokenLedger"),
    (snapshot) => {
      ledgerTotal = sumAmounts(snapshot.docs);
      emitBalance();
    },
    onError,
  );

  const unsubscribeAdjustments = onSnapshot(
    collection(db, "users", userId, "tokenAdjustments"),
    (snapshot) => {
      adjustmentTotal = sumAmounts(snapshot.docs);
      emitBalance();
    },
    onError,
  );

  const unsubscribeGame = onSnapshot(
    collection(db, "users", userId, "gameLedger"),
    (snapshot) => {
      gameTotal = sumAmounts(snapshot.docs);
      emitBalance();
    },
    onError,
  );

  return () => {
    unsubscribeLedger();
    unsubscribeAdjustments();
    unsubscribeGame();
  };
}
