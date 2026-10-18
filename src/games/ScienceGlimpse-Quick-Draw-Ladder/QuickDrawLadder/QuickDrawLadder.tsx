import React, { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Link } from "react-router-dom";
import "./quick-draw-ladder.css";
import Navigation from "@/components/Navigation";
import { useAuth } from "@/context/AuthContext";
import { useGameEnergy } from "@/hooks/useGameEnergy";
import {
  useQuickDrawLadder,
  type DuelReport,
} from "@/hooks/useQuickDrawLadder";
import {
  DRAWS_PER_DUEL,
  QUICK_DRAW_FASTEST_MS,
  QUICK_DRAW_SLOWEST_MS,
  quickDrawTier,
} from "@/lib/quickDraw";
import { TOKENS_PER_CHARGE } from "@/lib/tokens";

type Mode = "duel" | "warmup";

/*
 * ready      — waiting for the player to tap and start the next draw
 * steady     — counting down to DRAW!; any tap is a false start
 * decoy      — a fake-out flash; tapping it is a false start too
 * draw       — DRAW! is showing and the tap is being timed
 * drawResult — that draw's time, until the player taps for the next one
 * falseStart — a tap came too early; tap to redo the draw
 * finished   — the duel (or warm-up) is over
 */
type Phase =
  | "ready"
  | "steady"
  | "decoy"
  | "draw"
  | "drawResult"
  | "falseStart"
  | "finished";

type FalseStartReason = "early" | "decoy" | "guess";

interface DuelState {
  mode: Mode;
  phase: Phase;
  /** Every completed draw's time, in ms. */
  times: number[];
  falseStarts: number;
  falseStartReason: FalseStartReason | null;
  decoyWord: string;
  /** The player's best when the duel started; null before their first. */
  target: number | null;
  disqualified: boolean;
}

const MIN_WAIT_MS = 1500;
const MAX_WAIT_MS = 4500;

// A draw with a fake-out waits longer, so it never lands right before DRAW!.
const DECOY_MIN_WAIT_MS = 2800;
const DECOY_MAX_WAIT_MS = 5000;
const DECOY_CHANCE = 0.35;
const DECOY_SHOW_MS = 550;
const DECOY_WORDS = ["HOLD!", "NOT YET!", "WAIT!"];

/** The second false start in a duel disqualifies you. */
const MAX_FALSE_STARTS = 2;

/** "So close!" territory. */
const NEAR_MISS_MS = 15;

/*
 * Taps are ignored this long after a result appears, so a late tap on one
 * draw can't instantly start the next.
 */
const TAP_COOLDOWN_MS = 450;

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function averageOf(times: number[]) {
  return Math.round(
    times.reduce((total, time) => total + time, 0) / times.length
  );
}

function describeDuel(
  average: number,
  report: DuelReport
): { title: string; detail: string } {
  const { rank, size } = report.position;

  if (!report.saved) {
    return {
      title: "Time Not Saved",
      detail: report.overQuota
        ? "The leaderboard is over its daily limit, so your average couldn't be saved. Try again later."
        : "Your average couldn't be saved, so the leaderboard hasn't changed. Check your connection and try again.",
    };
  }

  const rankLine =
    rank !== null ? ` You're #${rank} of ${size}.` : "";

  if (report.previousBest === null) {
    return {
      title: "You're on the Leaderboard!",
      detail: `Welcome aboard.${rankLine}`,
    };
  }

  const behind = average - report.previousBest;

  if (report.newBest) {
    const climbed =
      report.previousRank !== null &&
      rank !== null &&
      rank < report.previousRank
        ? ` You're now #${rank}, up from #${report.previousRank}.`
        : rankLine;

    return {
      title: rank === 1 ? "New #1 Record! 👑" : "New Personal Best!",
      detail: `${-behind} ms faster than your old best.${climbed}`,
    };
  }

  if (behind <= NEAR_MISS_MS) {
    return {
      title: "So Close!",
      detail:
        behind === 0
          ? `Tied your best of ${report.previousBest} ms — you need to be faster to beat it.`
          : `Just ${behind} ms off your best of ${report.previousBest} ms.`,
    };
  }

  return {
    title: "Duel Over",
    detail: `${behind} ms off your best. Your best is still ${report.previousBest} ms.${rankLine}`,
  };
}

function falseStartMessage(reason: FalseStartReason | null) {
  if (reason === "decoy") {
    return "That was a fake-out — only tap on DRAW!";
  }

  if (reason === "guess") {
    return `Under ${QUICK_DRAW_FASTEST_MS} ms is a guess, not a reaction.`;
  }

  return "You tapped before DRAW!";
}

export default function QuickDrawLadder() {
  const { user, loading: authLoading } = useAuth();
  const gameEnergy = useGameEnergy("quick_draw_duel");
  const ladder = useQuickDrawLadder();

  // Null while the player is in the lobby.
  const [duel, setDuel] = useState<DuelState | null>(null);
  const duelRef = useRef<DuelState | null>(null);

  const [charging, setCharging] = useState(false);
  const [chargeError, setChargeError] = useState("");

  const [report, setReport] = useState<DuelReport | null>(null);
  const [saving, setSaving] = useState(false);

  const timersRef = useRef<number[]>([]);
  // When DRAW! was painted (performance.now()); null until it has been.
  const signalAtRef = useRef<number | null>(null);
  const tapsAllowedAtRef = useRef(0);

  const balance = gameEnergy.balance;
  const hasTokens =
    balance !== null && balance >= TOKENS_PER_CHARGE;

  const commitDuel = (next: DuelState | null) => {
    duelRef.current = next;
    setDuel(next);
  };

  const updateDuel = (changes: Partial<DuelState>) => {
    if (duelRef.current) {
      commitDuel({ ...duelRef.current, ...changes });
    }
  };

  const clearTimers = () => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  };

  const later = (ms: number, run: () => void) => {
    timersRef.current.push(window.setTimeout(run, ms));
  };

  // Ignore taps briefly, e.g. right after a result appears.
  const holdTaps = () => {
    tapsAllowedAtRef.current = performance.now() + TAP_COOLDOWN_MS;
  };

  const finishDuel = async (times: number[]) => {
    setSaving(true);

    const result = await ladder.reportDuel(averageOf(times));

    setReport(result);
    setSaving(false);
  };

  const recordDraw = (time: number) => {
    const current = duelRef.current;

    if (!current || current.phase !== "draw") {
      return;
    }

    clearTimers();
    holdTaps();

    const times = [...current.times, time];

    const done =
      current.mode === "warmup" || times.length >= DRAWS_PER_DUEL;

    updateDuel({
      times,
      phase: done ? "finished" : "drawResult",
    });

    if (done && current.mode === "duel") {
      void finishDuel(times);
    }
  };

  const falseStart = (reason: FalseStartReason) => {
    const current = duelRef.current;

    if (!current) {
      return;
    }

    clearTimers();
    holdTaps();

    // Warm-ups are for practice, so they never count strikes.
    const falseStarts =
      current.mode === "duel"
        ? current.falseStarts + 1
        : current.falseStarts;

    const disqualified =
      current.mode === "duel" && falseStarts >= MAX_FALSE_STARTS;

    updateDuel({
      falseStarts,
      falseStartReason: reason,
      disqualified,
      phase: disqualified ? "finished" : "falseStart",
    });
  };

  const startDraw = () => {
    const current = duelRef.current;

    if (!current) {
      return;
    }

    clearTimers();
    signalAtRef.current = null;

    // The first draw of a duel is always a clean one.
    const firstDuelDraw =
      current.mode === "duel" && current.times.length === 0;

    const withDecoy = !firstDuelDraw && Math.random() < DECOY_CHANCE;

    const wait = withDecoy
      ? randomBetween(DECOY_MIN_WAIT_MS, DECOY_MAX_WAIT_MS)
      : randomBetween(MIN_WAIT_MS, MAX_WAIT_MS);

    updateDuel({
      phase: "steady",
      decoyWord:
        DECOY_WORDS[Math.floor(Math.random() * DECOY_WORDS.length)],
    });

    if (withDecoy) {
      const decoyAt = randomBetween(900, wait - DECOY_SHOW_MS - 700);

      later(decoyAt, () => updateDuel({ phase: "decoy" }));
      later(decoyAt + DECOY_SHOW_MS, () =>
        updateDuel({ phase: "steady" })
      );
    }

    later(wait, () => {
      /*
       * Commit DRAW! to the page now, not whenever React next renders,
       * and start the clock on the frame that paints it — so every draw
       * is timed from the moment it actually appeared.
       */
      flushSync(() => updateDuel({ phase: "draw" }));

      requestAnimationFrame(() => {
        if (duelRef.current?.phase === "draw") {
          signalAtRef.current = performance.now();
        }
      });

      // Nobody tapped: score the slowest time and move on.
      later(QUICK_DRAW_SLOWEST_MS, () =>
        recordDraw(QUICK_DRAW_SLOWEST_MS)
      );
    });
  };

  const handleTap = () => {
    const current = duelRef.current;

    if (!current) {
      return;
    }

    switch (current.phase) {
      case "ready":
      case "drawResult":
      case "falseStart":
        if (performance.now() >= tapsAllowedAtRef.current) {
          startDraw();
        }
        return;

      case "steady":
        falseStart("early");
        return;

      case "decoy":
        falseStart("decoy");
        return;

      case "draw": {
        const signalAt = signalAtRef.current;

        const elapsed =
          signalAt === null
            ? 0
            : Math.round(performance.now() - signalAt);

        if (elapsed < QUICK_DRAW_FASTEST_MS) {
          falseStart("guess");
          return;
        }

        recordDraw(Math.min(elapsed, QUICK_DRAW_SLOWEST_MS));
        return;
      }

      default:
        return;
    }
  };

  // The keyboard listener lives for the whole duel, so it calls whatever
  // handleTap the latest render made.
  const handleTapRef = useRef(handleTap);
  handleTapRef.current = handleTap;

  const playing = duel !== null;

  useEffect(() => {
    if (!playing) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== " " && event.key !== "Enter") {
        return;
      }

      // Let Space and Enter press a focused button as usual.
      if (
        event.target instanceof HTMLElement &&
        event.target.closest("button, a, input, textarea")
      ) {
        return;
      }

      event.preventDefault();

      // Holding the key down is not a fresh tap.
      if (event.repeat) {
        return;
      }

      handleTapRef.current();
    };

    /*
     * Switching tabs mid-draw would otherwise run out the clock while
     * nobody can see it. The draw is simply restarted, with no penalty.
     */
    const handleVisibilityChange = () => {
      const phase = duelRef.current?.phase;

      if (
        document.visibilityState === "hidden" &&
        (phase === "steady" || phase === "decoy" || phase === "draw")
      ) {
        clearTimers();
        updateDuel({ phase: "ready" });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );
    };
    // updateDuel and clearTimers only touch refs, so they never go stale.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

  useEffect(() => {
    return () => {
      timersRef.current.forEach((id) => window.clearTimeout(id));
    };
  }, []);

  const startDuel = async () => {
    if (charging || !hasTokens || ladder.loading) {
      return;
    }

    setChargeError("");
    setCharging(true);

    // Fixed now, so the target can't shift mid-duel.
    const target = ladder.bestTime;

    const paid = await gameEnergy.spendToken();

    setCharging(false);

    if (!paid) {
      setChargeError(
        "Your token couldn't be spent, so the duel didn't start. Check your connection and try again."
      );
      commitDuel(null);
      return;
    }

    clearTimers();
    setReport(null);
    holdTaps();

    commitDuel({
      mode: "duel",
      phase: "ready",
      times: [],
      falseStarts: 0,
      falseStartReason: null,
      decoyWord: DECOY_WORDS[0],
      target,
      disqualified: false,
    });
  };

  const startWarmup = () => {
    clearTimers();
    setReport(null);
    setChargeError("");
    holdTaps();

    commitDuel({
      mode: "warmup",
      phase: "ready",
      times: [],
      falseStarts: 0,
      falseStartReason: null,
      decoyWord: DECOY_WORDS[0],
      target: null,
      disqualified: false,
    });
  };

  const backToLobby = () => {
    clearTimers();
    setReport(null);
    commitDuel(null);
  };

  const duelButtonLabel = () => {
    if (balance === null) {
      return "Loading your tokens...";
    }

    if (ladder.loading) {
      return "Loading the leaderboard...";
    }

    if (charging) {
      return `Spending ${TOKENS_PER_CHARGE} token...`;
    }

    if (!hasTokens) {
      return "Out of tokens — read an article to earn more";
    }

    return `Start a Duel — ${TOKENS_PER_CHARGE} token`;
  };

  const duelButtonDisabled =
    balance === null || ladder.loading || charging || !hasTokens;

  /*
   * Signed-in only, like ScienceGlimpse Summit: real tokens pay for each
   * duel, and the best time goes on the public leaderboard.
   */
  if (authLoading) {
    return (
      <div className="qd-shell">
        <Navigation />

        <div className="qd-stage">
          <div className="qd-card">
            <div className="qd-orb">🎯</div>
            <h2>Loading...</h2>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="qd-shell">
        <Navigation />

        <div className="qd-stage">
          <div className="qd-card">
            <div className="qd-orb">🔒</div>

            <h2>Sign In to Play</h2>

            <p>
              ScienceGlimpse Quick Draw Ladder is only available to
              signed-in ScienceGlimpse members — your real tokens pay
              for each duel, and your best time goes on the
              leaderboard.
            </p>

            <Link to="/login" className="qd-primary-button qd-link-button">
              Log In to Play
            </Link>

            <Link
              to="/quick-draw-ladder/leaderboard"
              className="qd-note qd-note-link"
            >
              View the leaderboard →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const renderStanding = () => {
    if (ladder.loading) {
      return <p className="qd-standing-detail">Loading the leaderboard...</p>;
    }

    if (ladder.errorMessage) {
      return (
        <p role="alert" className="qd-error">
          {ladder.errorMessage}
        </p>
      );
    }

    if (ladder.rank !== null && ladder.bestTime !== null) {
      return (
        <>
          <div className="qd-standing-row">
            <span className="qd-standing-rank">
              #{ladder.rank}
              {ladder.rank === 1 ? " 👑" : ""}
              <small> of {ladder.ladderSize}</small>
            </span>

            <span className="qd-standing-time">
              {ladder.bestTime} ms
            </span>
          </div>

          <p className="qd-standing-detail">
            Beat {ladder.bestTime} ms to set a new best
            {ladder.rank === 1
              ? " and stay on top."
              : " and move up the leaderboard."}
          </p>
        </>
      );
    }

    return (
      <p className="qd-standing-detail">
        {ladder.ladderSize > 0
          ? `${ladder.ladderSize} ${ladder.ladderSize === 1 ? "player is" : "players are"} on the leaderboard. Your first duel puts you on it.`
          : "Nobody's on the leaderboard yet — your first duel makes you #1."}
      </p>
    );
  };

  const renderLobby = () => (
    <div className="qd-stage">
      <div className="qd-card">
        <div className="qd-orb">🎯</div>

        <h2>Climb the Ladder</h2>

        <p>
          Tap the instant <strong className="qd-draw-word">DRAW!</strong>{" "}
          flashes. {DRAWS_PER_DUEL} draws make one average time, and
          your best average goes on the leaderboard.
        </p>

        <div className="qd-standing">
          <div className="qd-standing-label">YOUR STANDING</div>
          {renderStanding()}
        </div>

        <div className="qd-rules">
          <div>
            <kbd>SPACE</kbd>
            <span>Draw — or tap / click anywhere</span>
          </div>

          <div>
            <span className="qd-swatch qd-swatch-decoy">HOLD!</span>
            <span>A fake-out. Don't tap!</span>
          </div>

          <div>
            <span className="qd-swatch qd-swatch-strike">✕ ✕</span>
            <span>Two false starts and you're out</span>
          </div>
        </div>

        <button
          type="button"
          className="qd-primary-button"
          onClick={() => void startDuel()}
          disabled={duelButtonDisabled}
        >
          {duelButtonLabel()}
        </button>

        <button
          type="button"
          className="qd-secondary-button qd-wide"
          onClick={startWarmup}
        >
          Free Warm-Up Draw
        </button>

        {chargeError && (
          <p role="alert" className="qd-error">
            {chargeError}
          </p>
        )}

        <div className="qd-note">
          Each duel costs {TOKENS_PER_CHARGE} of your real ScienceGlimpse
          tokens
          {balance !== null ? ` (you have ${balance})` : ""}. Warm-ups
          are free but don't count.{" "}
          <Link to="/articles">Read articles</Link> to earn more tokens.
        </div>
      </div>
    </div>
  );

  const renderSignal = (current: DuelState) => {
    const drawNumber = Math.min(
      current.times.length + 1,
      DRAWS_PER_DUEL
    );

    const lastTime = current.times[current.times.length - 1];

    switch (current.phase) {
      case "ready":
        return (
          <>
            <div className="qd-signal-word qd-signal-small">
              Tap to Start
            </div>

            <p className="qd-signal-sub">
              {current.mode === "duel"
                ? `Draw ${drawNumber} of ${DRAWS_PER_DUEL} — wait for DRAW!, then tap as fast as you can.`
                : "Wait for DRAW!, then tap as fast as you can."}
            </p>
          </>
        );

      case "steady":
        return (
          <>
            <div className="qd-signal-word qd-signal-small qd-pulse">
              Steady...
            </div>

            <p className="qd-signal-sub">Wait for it.</p>
          </>
        );

      case "decoy":
        return (
          <div className="qd-signal-word">{current.decoyWord}</div>
        );

      case "draw":
        return <div className="qd-signal-word qd-signal-huge">DRAW!</div>;

      case "drawResult": {
        const diff =
          current.target !== null ? lastTime - current.target : null;

        return (
          <>
            <div className="qd-signal-word">
              {lastTime >= QUICK_DRAW_SLOWEST_MS
                ? "Too Slow!"
                : `${lastTime} ms`}
            </div>

            {diff !== null && (
              <p
                className={
                  diff < 0 ? "qd-signal-sub qd-good" : "qd-signal-sub qd-bad"
                }
              >
                {diff < 0
                  ? `${-diff} ms faster than your best`
                  : diff === 0
                    ? "Dead even with your best"
                    : `${diff} ms slower than your best`}
              </p>
            )}

            <p className="qd-signal-sub">
              Tap for draw {drawNumber} of {DRAWS_PER_DUEL}
            </p>
          </>
        );
      }

      case "falseStart":
        return (
          <>
            <div className="qd-signal-word">Too Soon!</div>

            <p className="qd-signal-sub">
              {falseStartMessage(current.falseStartReason)}
            </p>

            <p className="qd-signal-sub">
              {current.mode === "duel"
                ? `False start ${current.falseStarts} of ${MAX_FALSE_STARTS} — one more and you're out. Tap to redo draw ${drawNumber}.`
                : "No penalty in a warm-up. Tap to try again."}
            </p>
          </>
        );

      default:
        return null;
    }
  };

  const renderResults = (current: DuelState) => {
    if (current.mode === "warmup") {
      const time = current.times[0];
      const tier = quickDrawTier(time);

      return (
        <div className="qd-card qd-results">
          <div className="qd-orb">{tier.emoji}</div>

          <h2>
            {time >= QUICK_DRAW_SLOWEST_MS ? "Too Slow!" : `${time} ms`}
          </h2>

          <p className="qd-tier">{tier.label}</p>

          <p>
            Warm-ups are free and don't count. Ready to get on the
            leaderboard? Most people average around 250 ms.
          </p>

          <button
            type="button"
            className="qd-primary-button"
            onClick={() => void startDuel()}
            disabled={duelButtonDisabled}
          >
            {duelButtonLabel()}
          </button>

          <div className="qd-result-actions">
            <button
              type="button"
              className="qd-secondary-button"
              onClick={startWarmup}
            >
              Another Warm-Up
            </button>

            <button
              type="button"
              className="qd-secondary-button"
              onClick={backToLobby}
            >
              Back to Lobby
            </button>
          </div>
        </div>
      );
    }

    if (current.disqualified) {
      return (
        <div className="qd-card qd-results">
          <div className="qd-orb">🚫</div>

          <h2>Disqualified</h2>

          <p>
            Two false starts — the duel's over. Your best time is safe.
            Wait for the green DRAW! next time.
          </p>

          <button
            type="button"
            className="qd-primary-button"
            onClick={() => void startDuel()}
            disabled={duelButtonDisabled}
          >
            {duelButtonLabel()}
          </button>

          <div className="qd-result-actions">
            <button
              type="button"
              className="qd-secondary-button"
              onClick={backToLobby}
            >
              Back to Lobby
            </button>
          </div>
        </div>
      );
    }

    const average = averageOf(current.times);
    const tier = quickDrawTier(average);

    if (saving || !report) {
      return (
        <div className="qd-card qd-results">
          <div className="qd-orb">{tier.emoji}</div>
          <h2>{average} ms</h2>
          <p>Saving your time...</p>
        </div>
      );
    }

    const verdict = describeDuel(average, report);

    return (
      <div className="qd-card qd-results">
        <div className="qd-orb">{tier.emoji}</div>

        <div className="qd-results-kicker">{verdict.title}</div>

        <h2>{average} ms</h2>

        <p className="qd-tier">
          {tier.label} · your average of {DRAWS_PER_DUEL}
        </p>

        <p>{verdict.detail}</p>

        <button
          type="button"
          className="qd-primary-button"
          onClick={() => void startDuel()}
          disabled={duelButtonDisabled}
        >
          {duelButtonLabel()}
        </button>

        <div className="qd-result-actions">
          <Link
            to="/quick-draw-ladder/leaderboard"
            className="qd-secondary-button"
          >
            Leaderboard
          </Link>

          <button
            type="button"
            className="qd-secondary-button"
            onClick={backToLobby}
          >
            Back to Lobby
          </button>
        </div>
      </div>
    );
  };

  const renderArena = (current: DuelState) => (
    <div
      className={`qd-arena qd-phase-${current.phase}`}
      onPointerDown={(event) => {
        // Buttons in the arena work as buttons, not as draws.
        if (
          event.button !== 0 ||
          (event.target instanceof HTMLElement &&
            event.target.closest("button, a"))
        ) {
          return;
        }

        handleTap();
      }}
    >
      <div className="qd-arena-bar">
        <span>
          {current.mode === "duel"
            ? `DRAW ${Math.min(current.times.length + 1, DRAWS_PER_DUEL)} OF ${DRAWS_PER_DUEL}`
            : "WARM-UP"}
        </span>

        {current.target !== null && (
          <span>YOUR BEST {current.target} MS</span>
        )}

        {current.mode === "duel" && (
          <span
            className="qd-strikes"
            aria-label={`${current.falseStarts} of ${MAX_FALSE_STARTS} false starts`}
          >
            {Array.from({ length: MAX_FALSE_STARTS }, (_, index) => (
              <i
                key={index}
                className={index < current.falseStarts ? "is-struck" : ""}
              />
            ))}
          </span>
        )}
      </div>

      <div className="qd-signal" aria-live="assertive">
        {current.phase === "finished"
          ? renderResults(current)
          : renderSignal(current)}
      </div>

      {current.mode === "duel" && (
        <div className="qd-pips">
          {Array.from({ length: DRAWS_PER_DUEL }, (_, index) => {
            const time = current.times[index];

            const state =
              time === undefined
                ? ""
                : current.target === null || time < current.target
                  ? "is-good"
                  : "is-bad";

            return (
              <span key={index} className={`qd-pip ${state}`}>
                {time === undefined ? index + 1 : time}
              </span>
            );
          })}
        </div>
      )}

      {current.phase !== "finished" && (
        <button
          type="button"
          className="qd-leave"
          onClick={backToLobby}
        >
          {current.mode === "duel" ? "Forfeit" : "Leave"}
        </button>
      )}
    </div>
  );

  return (
    <div className="qd-shell">
      <Navigation />

      {/* HEADER */}
      <div className="qd-header">
        <div>
          <div className="qd-kicker">SCIENCEGLIMPSE GAME 2</div>

          <h1>ScienceGlimpse Quick Draw Ladder</h1>

          <p>
            Tap the instant DRAW! flashes. Each duel costs{" "}
            {TOKENS_PER_CHARGE} token, and your best average goes on the
            leaderboard.
          </p>
        </div>

        <div className="qd-header-side">
          <Link
            to="/quick-draw-ladder/leaderboard"
            className="qd-secondary-button"
          >
            Leaderboard
          </Link>

          <div className="qd-stats">
            <div className="qd-stat">
              <span>BEST</span>
              <strong>
                {ladder.bestTime !== null ? `${ladder.bestTime} ms` : "—"}
              </strong>
            </div>

            <div className="qd-stat">
              <span>RANK</span>
              <strong>{ladder.rank !== null ? `#${ladder.rank}` : "—"}</strong>
            </div>

            <div className="qd-stat qd-tokens">
              <span>TOKENS</span>
              <strong>{balance ?? "…"}</strong>
            </div>
          </div>
        </div>
      </div>

      {duel ? renderArena(duel) : renderLobby()}
    </div>
  );
}
