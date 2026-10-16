import { useEffect, useRef, useState } from "react";
import {
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  type Timestamp,
} from "firebase/firestore";

import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";

const HEARTBEAT_SECONDS = 15;
const REWARD_SECONDS = 240;
const IDLE_LIMIT_MS = 60_000;

// Keep in step with the 180s in firestore.rules (rewardCooldown).
const REWARD_COOLDOWN_MS = 180_000;

// How long to wait before retrying a heartbeat Firestore refused.
const RETRY_DELAY_MS = 15_000;

interface HeartbeatResult {
  activeSeconds: number;
  rewarded: boolean;
  /**
   * Set when the article is finished but the account earned another
   * reward under three minutes ago: when the rules will next allow one.
   * Nothing was written in that case.
   */
  cooldownEndsAt: number | null;
}

async function recordReadingHeartbeat(
  userId: string,
  articleId: string,
): Promise<HeartbeatResult> {
  const progressReference = doc(
    db,
    "users",
    userId,
    "readingProgress",
    articleId,
  );

  const rewardReference = doc(
    db,
    "users",
    userId,
    "tokenLedger",
    articleId,
  );

  const cooldownReference = doc(
    db,
    "users",
    userId,
    "rewardCooldown",
    "latest",
  );

  return runTransaction(db, async (transaction) => {
    const progressSnapshot =
      await transaction.get(progressReference);

    if (!progressSnapshot.exists()) {
      transaction.set(progressReference, {
        articleId,
        activeSeconds: HEARTBEAT_SECONDS,
        rewarded: false,
        lastHeartbeatAt: serverTimestamp(),
        rewardedAt: null,
      });

      return {
        activeSeconds: HEARTBEAT_SECONDS,
        rewarded: false,
        cooldownEndsAt: null,
      };
    }

    const progress = progressSnapshot.data();

    const currentSeconds =
      typeof progress.activeSeconds === "number"
        ? progress.activeSeconds
        : 0;

    const alreadyRewarded = progress.rewarded === true;

    if (alreadyRewarded) {
      return {
        activeSeconds: REWARD_SECONDS,
        rewarded: true,
        cooldownEndsAt: null,
      };
    }

    const nextSeconds = Math.min(
      currentSeconds + HEARTBEAT_SECONDS,
      REWARD_SECONDS,
    );

    const shouldReward = nextSeconds >= REWARD_SECONDS;

    /*
     * Rewards are limited to one every three minutes (firestore.rules
     * claimsRewardCooldown). Checked here first so a finished article
     * waits quietly instead of sending a write the rules would refuse.
     */
    if (shouldReward) {
      const cooldownSnapshot =
        await transaction.get(cooldownReference);

      const lastRewardedAt = cooldownSnapshot.exists()
        ? (
            cooldownSnapshot.data().rewardedAt as
              | Timestamp
              | undefined
          )?.toMillis?.()
        : undefined;

      if (
        lastRewardedAt !== undefined &&
        Date.now() < lastRewardedAt + REWARD_COOLDOWN_MS
      ) {
        return {
          activeSeconds: currentSeconds,
          rewarded: false,
          cooldownEndsAt: lastRewardedAt + REWARD_COOLDOWN_MS,
        };
      }
    }

    transaction.update(progressReference, {
      activeSeconds: nextSeconds,
      rewarded: shouldReward,
      lastHeartbeatAt: serverTimestamp(),
      rewardedAt: shouldReward ? serverTimestamp() : null,
    });

    if (shouldReward) {
      transaction.set(rewardReference, {
        articleId,
        amount: 10,
        type: "article_read",
        createdAt: serverTimestamp(),
      });

      transaction.set(cooldownReference, {
        articleId,
        rewardedAt: serverTimestamp(),
      });
    }

    return {
      activeSeconds: nextSeconds,
      rewarded: shouldReward,
      cooldownEndsAt: null,
    };
  });
}

export function useArticleReadingReward(
  articleId: string | null,
) {
  const {
    user,
    loading: authLoading,
    emailVerified,
  } = useAuth();

  const articleRef = useRef<HTMLElement | null>(null);
  const articleInViewRef = useRef(false);
  const lastActivityRef = useRef(Date.now());
  const pendingSecondsRef = useRef(0);
  const confirmedSecondsRef = useRef(0);
  const sendingRef = useRef(false);
  // No heartbeat is sent before this time (ms since epoch).
  const retryAtRef = useRef(0);

  const [activeSeconds, setActiveSeconds] = useState(0);
  const [rewarded, setRewarded] = useState(false);
  const [waitingForCooldown, setWaitingForCooldown] =
    useState(false);
  const [isActivelyReading, setIsActivelyReading] =
    useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const userId = user?.uid ?? null;

  // Load previously confirmed reading progress.
  useEffect(() => {
    pendingSecondsRef.current = 0;
    confirmedSecondsRef.current = 0;
    sendingRef.current = false;
    retryAtRef.current = 0;
    lastActivityRef.current = Date.now();

    setActiveSeconds(0);
    setRewarded(false);
    setWaitingForCooldown(false);
    setIsActivelyReading(false);
    setErrorMessage("");

    if (authLoading) {
      setLoading(true);
      return;
    }

    if (!userId || !articleId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const loadProgress = async () => {
      setLoading(true);

      try {
        const progressReference = doc(
          db,
          "users",
          userId,
          "readingProgress",
          articleId,
        );

        const progressSnapshot =
          await getDoc(progressReference);

        if (cancelled || !progressSnapshot.exists()) {
          return;
        }

        const progress = progressSnapshot.data();

        const storedSeconds =
          typeof progress.activeSeconds === "number"
            ? Math.min(
                progress.activeSeconds,
                REWARD_SECONDS,
              )
            : 0;

        const storedRewarded = progress.rewarded === true;

        confirmedSecondsRef.current = storedSeconds;

        setActiveSeconds(storedSeconds);
        setRewarded(storedRewarded);
      } catch (error) {
        console.error(
          "Could not load reading progress:",
          error,
        );

        if (!cancelled) {
          setErrorMessage(
            "Reading progress could not be loaded.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadProgress();

    return () => {
      cancelled = true;
    };
  }, [articleId, authLoading, userId]);

  // Check whether any portion of the article is visible.
  useEffect(() => {
    const articleElement = articleRef.current;

    if (!articleElement) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        articleInViewRef.current = entry.isIntersecting;
      },
      {
        threshold: 0,
      },
    );

    observer.observe(articleElement);

    return () => {
      observer.disconnect();
      articleInViewRef.current = false;
    };
  }, [articleId]);

  // Track real interaction and pause when the user leaves.
  useEffect(() => {
    const markActivity = () => {
      lastActivityRef.current = Date.now();
    };

    const pauseUntilNextInteraction = () => {
      lastActivityRef.current = 0;
      setIsActivelyReading(false);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible") {
        pauseUntilNextInteraction();
      }
    };

    window.addEventListener("scroll", markActivity, {
      passive: true,
    });

    window.addEventListener("pointerdown", markActivity);
    window.addEventListener("keydown", markActivity);

    window.addEventListener("touchstart", markActivity, {
      passive: true,
    });

    window.addEventListener(
      "blur",
      pauseUntilNextInteraction,
    );

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange,
    );

    return () => {
      window.removeEventListener("scroll", markActivity);
      window.removeEventListener(
        "pointerdown",
        markActivity,
      );
      window.removeEventListener("keydown", markActivity);
      window.removeEventListener(
        "touchstart",
        markActivity,
      );
      window.removeEventListener(
        "blur",
        pauseUntilNextInteraction,
      );

      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange,
      );
    };
  }, [articleId]);

  // Count active reading time and confirm it with Firestore.
  useEffect(() => {
    // Unverified accounts can't earn (firestore.rules emailVerified), so
    // their reading isn't tracked at all; the page asks them to verify.
    if (
      authLoading ||
      loading ||
      !userId ||
      !articleId ||
      !emailVerified ||
      rewarded
    ) {
      setIsActivelyReading(false);
      return;
    }

    const intervalId = window.setInterval(() => {
      const isActive =
        document.visibilityState === "visible" &&
        document.hasFocus() &&
        articleInViewRef.current &&
        Date.now() - lastActivityRef.current <
          IDLE_LIMIT_MS;

      setIsActivelyReading(isActive);

      if (!isActive || sendingRef.current) {
        return;
      }

      pendingSecondsRef.current += 1;

      setActiveSeconds(
        Math.min(
          confirmedSecondsRef.current +
            pendingSecondsRef.current,
          REWARD_SECONDS,
        ),
      );

      if (
        pendingSecondsRef.current <
          HEARTBEAT_SECONDS ||
        Date.now() < retryAtRef.current
      ) {
        return;
      }

      sendingRef.current = true;

      void recordReadingHeartbeat(userId, articleId)
        .then((result) => {
          setErrorMessage("");

          // Finished, but too soon after the last reward: keep the
          // unsent seconds and try again once the cooldown is over.
          if (result.cooldownEndsAt !== null) {
            retryAtRef.current = result.cooldownEndsAt;
            setWaitingForCooldown(true);
            return;
          }

          confirmedSecondsRef.current =
            result.activeSeconds;

          pendingSecondsRef.current = 0;

          setActiveSeconds(result.activeSeconds);
          setRewarded(result.rewarded);
          setWaitingForCooldown(false);
        })
        .catch((error) => {
          console.error(
            "Could not record reading progress:",
            error,
          );

          retryAtRef.current = Date.now() + RETRY_DELAY_MS;

          setErrorMessage(
            "Reading progress could not be saved yet. Retrying automatically.",
          );
        })
        .finally(() => {
          sendingRef.current = false;
        });
    }, 1_000);

    return () => {
      window.clearInterval(intervalId);
      setIsActivelyReading(false);
    };
  }, [
    articleId,
    authLoading,
    emailVerified,
    loading,
    rewarded,
    userId,
  ]);

  return {
    articleRef,
    activeSeconds,
    rewarded,
    waitingForCooldown,
    isActivelyReading,
    loading: authLoading || loading,
    errorMessage,
    signedIn: Boolean(user),
    emailVerified,
  };
}