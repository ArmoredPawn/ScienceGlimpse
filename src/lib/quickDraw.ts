/**
 * Shared ScienceGlimpse Quick Draw Ladder values, used by the game, the
 * ladder hook and the public leaderboard page.
 */

/** Public leaderboard collection (firestore.rules quickDrawLeaderboard). */
export const QUICK_DRAW_LEADERBOARD = "quickDrawLeaderboard";

/** users/{uid}/gameStats/{this} holds a player's best time. */
export const QUICK_DRAW_STAT_ID = "quickDraw";

export const DRAWS_PER_DUEL = 5;

/**
 * Nobody can see a signal and react in under 100 ms, so a tap that fast
 * was a guess and counts as a false start — the same line athletics uses
 * for a sprint start. A draw nobody taps for is scored as the slowest
 * time. Both bounds are mirrored in firestore.rules (validQuickDrawTime),
 * so a best time outside them can't be saved — keep the two in sync.
 */
export const QUICK_DRAW_FASTEST_MS = 100;
export const QUICK_DRAW_SLOWEST_MS = 1000;

export interface QuickDrawTier {
  emoji: string;
  label: string;
}

/** A fun title for a reaction time, shown on results and the ladder. */
export function quickDrawTier(ms: number): QuickDrawTier {
  if (ms < 200) {
    return { emoji: "⚡", label: "Lightning" };
  }

  if (ms < 250) {
    return { emoji: "🎯", label: "Sharpshooter" };
  }

  if (ms < 300) {
    return { emoji: "🔥", label: "Quick Draw" };
  }

  if (ms < 400) {
    return { emoji: "✋", label: "Steady Hand" };
  }

  return { emoji: "🐢", label: "Warming Up" };
}
