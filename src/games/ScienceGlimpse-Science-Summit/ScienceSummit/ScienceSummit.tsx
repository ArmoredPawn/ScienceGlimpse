import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "./science-summit.css";
import Navigation from "@/components/Navigation";
import { useAuth } from "@/context/AuthContext";
import { useGameEnergy } from "@/hooks/useGameEnergy";
import { useBestAltitude } from "@/hooks/useBestAltitude";

type Platform = {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

type Player = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  grounded: boolean;
  jumpsLeft: number;
};

type Props = {
  /**
   * Energy used when the player is not signed in (practice mode, not
   * tied to real ScienceGlimpse tokens). Signed-in players always start
   * with their real token balance instead — see useGameEnergy.
   */
  practiceEnergy?: number;
};

const WORLD_WIDTH = 1000;
const VIEW_HEIGHT = 720;

const PLAYER_W = 34;
const PLAYER_H = 46;

const GRAVITY = 0.58;
const MOVE_ACCEL = 0.72;
const AIR_ACCEL = 0.48;
const MAX_SPEED = 6.8;
const FRICTION = 0.78;

const MAX_FALL_SPEED = 22;

const JUMP_VELOCITY = -12.4;
const DOUBLE_JUMP_VELOCITY = -11.2;

const PLATFORM_H = 18;
const PLATFORM_GAP_MIN = 65;
const PLATFORM_GAP_MAX = 103;
/**
 * A single jump (JUMP_VELOCITY^2 / (2*GRAVITY)) rises about 126 world-units
 * at most. Keeping the difficulty-scaled vertical gap comfortably under that
 * means every gap is coverable by ONE well-timed jump, with the double jump
 * staying an optional skill bonus rather than something a gap requires just
 * to survive with zero horizontal room to spare.
 */
const PLATFORM_GAP_MAX_DIFFICULTY_BONUS = 15;

const JUMPS_PER_TOKEN = 10;
const TOKENS_PER_CHARGE = 1;
const LAVA_START_Y = 875;
const LAVA_BASE_SPEED = 0.8;
const LAVA_SPEED_STEP = 0.30;
const LAVA_MILESTONE_METERS = 100;

const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, n));

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

const PLATFORM_MIN_HORIZONTAL_GAP = 30;

function generatePlatforms(
  fromY: number,
  count: number,
  nextId: number,
  seedPlatform: Platform | null
): Platform[] {
  const result: Platform[] = [];
  let y = fromY;

  const altitude = Math.max(0, Math.abs(fromY));
  const difficulty = clamp(altitude / 7000, 0, 1);

  for (let i = 0; i < count; i++) {
    const gapMaxForDifficulty =
      PLATFORM_GAP_MAX +
      difficulty * PLATFORM_GAP_MAX_DIFFICULTY_BONUS;

    const verticalGap = randomBetween(
      PLATFORM_GAP_MIN + difficulty * 8,
      gapMaxForDifficulty
    );

    y -= verticalGap;

    const width = randomBetween(
      145 - difficulty * 35,
      225 - difficulty * 50
    );

    const previous = result[i - 1] ?? seedPlatform;

    let x = randomBetween(45, WORLD_WIDTH - width - 45);

    if (previous) {
      /*
       * A platform's vertical gap and horizontal shift were previously
       * capped independently, so a single platform could roll a
       * near-maximum gap AND a near-maximum shift at the same time —
       * a combination no jump can comfortably cover. Landings that
       * were barely possible ended up right at the target's far edge
       * with no room to stop, so residual jump momentum (or just
       * holding the move key) carried the player straight off it a
       * frame or two after touching down — indistinguishable from the
       * platform not being there at all. Scaling the shift budget down
       * as the vertical gap eats into a single jump's ~126-unit reach
       * keeps the two from maxing out together, so jumps land with
       * margin to spare instead of right on the ragged edge.
       */
      const verticalReachUsed = clamp(
        (verticalGap - PLATFORM_GAP_MIN) /
          (gapMaxForDifficulty - PLATFORM_GAP_MIN),
        0,
        1
      );

      const minShift =
        previous.width / 2 +
        width / 2 +
        PLATFORM_MIN_HORIZONTAL_GAP;

      const shiftBudget = 260 + difficulty * 45;

      const maxShift = Math.max(
        minShift,
        shiftBudget * (1 - verticalReachUsed * 0.6)
      );

      const shiftMagnitude = randomBetween(minShift, maxShift);
      const direction = Math.random() < 0.5 ? -1 : 1;

      const center = previous.x + previous.width / 2;

      x = clamp(
        center + direction * shiftMagnitude - width / 2,
        35,
        WORLD_WIDTH - width - 35
      );

      const stillOverlaps =
        x + width + PLATFORM_MIN_HORIZONTAL_GAP > previous.x &&
        x < previous.x + previous.width + PLATFORM_MIN_HORIZONTAL_GAP;

      if (stillOverlaps) {
        x = clamp(
          center - direction * minShift - width / 2,
          35,
          WORLD_WIDTH - width - 35
        );
      }
    }

    result.push({
      id: nextId + i,
      x,
      y,
      width,
      height: PLATFORM_H,
    });
  }

  return result;
}

function makeInitialPlatforms(): Platform[] {
  return [
    {
      id: 0,
      x: 350,
      y: 650,
      width: 300,
      height: PLATFORM_H,
    },
    {
      id: 1,
      x: 160,
      y: 550,
      width: 210,
      height: PLATFORM_H,
    },
    {
      id: 2,
      x: 515,
      y: 455,
      width: 205,
      height: PLATFORM_H,
    },
    {
      id: 3,
      x: 260,
      y: 355,
      width: 190,
      height: PLATFORM_H,
    },
    {
      id: 4,
      x: 600,
      y: 255,
      width: 180,
      height: PLATFORM_H,
    },
    {
      id: 5,
      x: 385,
      y: 155,
      width: 180,
      height: PLATFORM_H,
    },
  ];
}

export default function ScienceSummit({
  practiceEnergy = 35,
}: Props) {
  const { user } = useAuth();
  const gameEnergy = useGameEnergy();

  /*
   * Signed-in players play with their real ScienceGlimpse token balance
   * as energy. Signed-out players get a fixed practice pool that is
   * never persisted.
   */
  const startingEnergy = gameEnergy.signedIn
    ? gameEnergy.balance ?? 0
    : practiceEnergy;

  const canStartGame =
    !gameEnergy.signedIn || gameEnergy.balance !== null;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const keysRef = useRef<Set<string>>(new Set());

  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef(0);

  const playerRef = useRef<Player>({
    x: 483,
    y: 595,
    vx: 0,
    vy: 0,
    width: PLAYER_W,
    height: PLAYER_H,
    grounded: false,
    jumpsLeft: 2,
  });

  const platformsRef = useRef<Platform[]>(
    makeInitialPlatforms()
  );

  const nextPlatformIdRef = useRef(6);

  const cameraYRef = useRef(0);

  const lavaYRef = useRef(LAVA_START_Y);

  const maxHeightRef = useRef(0);

  const checkpointRef = useRef({
    x: 483,
    y: 595,
  });

  /*
   * Counts jumps since the last token was spent (0..9). Every 10th
   * jump resets this to 0 and spends 1 token. Kept as a ref (not
   * state) since it doesn't need to re-render anything on its own.
   */
  const jumpsSinceChargeRef = useRef(0);

  /*
   * Keep the latest energy value available to the game loop
   * without forcing the animation loop to restart every time
   * energy changes.
   */
  const energyRef = useRef(startingEnergy);

  const [started, setStarted] = useState(false);

  const [energy, setEnergyState] = useState(startingEnergy);

  const [height, setHeight] = useState(0);

  const { bestAltitude: bestHeight, reportAltitude } =
    useBestAltitude();

  const [message, setMessage] = useState("");

  const [gameOver, setGameOver] = useState(false);

  const [diedInLava, setDiedInLava] = useState(false);

  const [paused, setPaused] = useState(false);

  /*
   * Centralized energy setter.
   */
  const setEnergy = useCallback(
    (
      value:
        | number
        | ((current: number) => number)
    ) => {
      setEnergyState((current) => {
        const next =
          typeof value === "function"
            ? value(current)
            : value;

        energyRef.current = next;

        return next;
      });
    },
    []
  );

  /*
   * Reset the entire game.
   */
  const resetGame = useCallback(() => {
    playerRef.current = {
      x: 483,
      y: 595,
      vx: 0,
      vy: 0,
      width: PLAYER_W,
      height: PLAYER_H,
      grounded: false,
      jumpsLeft: 2,
    };

    platformsRef.current = makeInitialPlatforms();

    nextPlatformIdRef.current = 6;

    cameraYRef.current = 0;

    lavaYRef.current = LAVA_START_Y;

    maxHeightRef.current = 0;

    checkpointRef.current = {
      x: 483,
      y: 595,
    };

    jumpsSinceChargeRef.current = 0;

    energyRef.current = startingEnergy;

    setEnergyState(startingEnergy);

    setHeight(0);

    setMessage("");

    setGameOver(false);

    setDiedInLava(false);

    setPaused(false);

    setStarted(true);

    lastTimeRef.current = 0;
  }, [startingEnergy]);

  /*
   * Jump. This is the only way tokens are spent: every 10 jumps
   * (grounded or double-jump) costs 1 token. Once tokens hit 0,
   * jumping is refused entirely.
   */
  const doJump = useCallback(() => {
    if (!started || paused || gameOver) {
      return;
    }

    if (energyRef.current <= 0) {
      setMessage("Out of tokens — you can't jump anymore!");
      return;
    }

    const player = playerRef.current;

    let jumped = false;

    if (player.grounded) {
      player.vy = JUMP_VELOCITY;
      player.grounded = false;
      player.jumpsLeft = 1;
      jumped = true;
    } else if (player.jumpsLeft > 0) {
      player.vy = DOUBLE_JUMP_VELOCITY;
      player.jumpsLeft = 0;
      jumped = true;
    }

    if (!jumped) {
      return;
    }

    jumpsSinceChargeRef.current += 1;

    if (jumpsSinceChargeRef.current >= JUMPS_PER_TOKEN) {
      jumpsSinceChargeRef.current = 0;

      setEnergy((e) => Math.max(0, e - TOKENS_PER_CHARGE));

      if (gameEnergy.signedIn) {
        gameEnergy.spendToken();
      }
    }
  }, [
    started,
    paused,
    gameOver,
    setEnergy,
    gameEnergy,
  ]);

  /*
   * Keyboard controls.
   */
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();

      if (
        [
          "arrowleft",
          "arrowright",
          "a",
          "d",
          "w",
          "arrowup",
          " ",
        ].includes(key)
      ) {
        event.preventDefault();
      }

      keysRef.current.add(key);

      if (
        key === " " ||
        key === "w" ||
        key === "arrowup"
      ) {
        doJump();
      }

      if (
        key === "p" &&
        started &&
        !gameOver
      ) {
        setPaused((value) => !value);
      }

      /*
       * Escape closes the pause screen.
       */
      if (key === "escape" && paused && !gameOver) {
        setPaused(false);
      }
    };

    const onKeyUp = (event: KeyboardEvent) => {
      keysRef.current.delete(
        event.key.toLowerCase()
      );
    };

    window.addEventListener(
      "keydown",
      onKeyDown
    );

    window.addEventListener(
      "keyup",
      onKeyUp
    );

    return () => {
      window.removeEventListener(
        "keydown",
        onKeyDown
      );

      window.removeEventListener(
        "keyup",
        onKeyUp
      );
    };
  }, [
    doJump,
    gameOver,
    paused,
    started,
  ]);

  /*
   * Main game loop.
   */
  useEffect(() => {
    if (!started || gameOver) {
      return;
    }

    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");

    if (!context) {
      return;
    }

    const resizeCanvas = () => {
      const rect =
        canvas.getBoundingClientRect();

      const dpr = Math.min(
        window.devicePixelRatio || 1,
        2
      );

      canvas.width = Math.floor(
        rect.width * dpr
      );

      canvas.height = Math.floor(
        rect.height * dpr
      );

      context.setTransform(
        dpr,
        0,
        0,
        dpr,
        0,
        0
      );
    };

    resizeCanvas();

    window.addEventListener(
      "resize",
      resizeCanvas
    );

    const draw = (
      ctx: CanvasRenderingContext2D,
      width: number,
      heightPx: number,
      scale: number
    ) => {
      const cameraY =
        cameraYRef.current;

      const player =
        playerRef.current;

      ctx.clearRect(
        0,
        0,
        width,
        heightPx
      );

      /*
       * Background.
       */
      const gradient =
        ctx.createLinearGradient(
          0,
          0,
          0,
          heightPx
        );

      gradient.addColorStop(
        0,
        "#07152e"
      );

      gradient.addColorStop(
        0.55,
        "#0b2450"
      );

      gradient.addColorStop(
        1,
        "#102f4b"
      );

      ctx.fillStyle = gradient;

      ctx.fillRect(
        0,
        0,
        width,
        heightPx
      );

      /*
       * Background particles.
       */
      ctx.save();

      for (let i = 0; i < 70; i++) {
        const x =
          ((i * 173) %
            WORLD_WIDTH) *
          scale;

        const y =
          (((i * 97) %
            1300) -
            (cameraY * 0.15) %
              1300) *
          scale;

        ctx.globalAlpha =
          0.22 + (i % 4) * 0.08;

        ctx.fillStyle =
          "#b8d8ff";

        ctx.beginPath();

        ctx.arc(
          x,
          ((y % heightPx) +
            heightPx) %
            heightPx,
          i % 3 === 0
            ? 2.4
            : 1.3,
          0,
          Math.PI * 2
        );

        ctx.fill();
      }

      ctx.restore();

      /*
       * Altitude lines.
       */
      const bandEvery = 500;

      const topWorld =
        cameraY - 300;

      const bottomWorld =
        cameraY +
        heightPx / scale +
        300;

      for (
        let band =
          Math.floor(
            topWorld /
              (bandEvery * -1)
          ) *
          -bandEvery;
        band >
        topWorld -
          bandEvery * 2;
        band -= bandEvery
      ) {
        if (band > 0) {
          continue;
        }

        const screenY =
          (band - cameraY) *
          scale;

        if (
          screenY < -30 ||
          screenY >
            heightPx + 30
        ) {
          continue;
        }

        ctx.globalAlpha = 0.13;

        ctx.strokeStyle =
          "#b8d8ff";

        ctx.beginPath();

        ctx.moveTo(
          0,
          screenY
        );

        ctx.lineTo(
          width,
          screenY
        );

        ctx.stroke();

        ctx.globalAlpha = 1;
      }

      /*
       * Lava. Drawn before platforms/player so they visibly poke up
       * out of it as it rises.
       */
      const lavaScreenY =
        (lavaYRef.current - cameraY) * scale;

      if (lavaScreenY < heightPx) {
        const lavaTop = Math.max(0, lavaScreenY);

        const lavaGradient = ctx.createLinearGradient(
          0,
          lavaTop,
          0,
          heightPx
        );

        lavaGradient.addColorStop(0, "#ffe08a");
        lavaGradient.addColorStop(0.15, "#ff8a3d");
        lavaGradient.addColorStop(1, "#7a1405");

        ctx.fillStyle = lavaGradient;

        ctx.fillRect(
          0,
          lavaTop,
          width,
          heightPx - lavaTop
        );

        ctx.save();

        ctx.globalAlpha = 0.85;
        ctx.strokeStyle = "#ffe9b0";
        ctx.lineWidth = 3;

        ctx.beginPath();

        const waveTime = Date.now() / 320;

        for (let x = 0; x <= width; x += 14) {
          const waveY =
            lavaScreenY +
            Math.sin(x / 28 + waveTime) * 3;

          if (x === 0) {
            ctx.moveTo(x, waveY);
          } else {
            ctx.lineTo(x, waveY);
          }
        }

        ctx.stroke();

        ctx.restore();
      }

      /*
       * Platforms.
       */
      for (const platform of platformsRef.current) {
        const sx =
          platform.x * scale;

        const sy =
          (platform.y -
            cameraY) *
          scale;

        const sw =
          platform.width *
          scale;

        const sh =
          platform.height *
          scale;

        if (
          sy < -40 ||
          sy >
            heightPx + 40
        ) {
          continue;
        }

        ctx.fillStyle =
          "#d8f3ff";

        ctx.fillRect(
          sx,
          sy,
          sw,
          sh
        );

        ctx.fillStyle =
          "#65b7d6";

        ctx.fillRect(
          sx,
          sy + sh * 0.55,
          sw,
          sh * 0.45
        );

        ctx.fillStyle =
          "#ffffff";

        ctx.fillRect(
          sx + 8 * scale,
          sy + 3 * scale,
          sw - 16 * scale,
          3 * scale
        );
      }

      /*
       * Player — astronaut outfit.
       * This keeps the original character proportions/shape, but
       * dresses the character in a simple science-explorer spacesuit.
       */
      const px =
        player.x * scale;

      const py =
        (player.y -
          cameraY) *
        scale;

      const pw =
        player.width * scale;

      const ph =
        player.height * scale;

      ctx.save();

      ctx.translate(
        px + pw / 2,
        py + ph / 2
      );

      ctx.rotate(
        clamp(
          player.vx / 20,
          -0.18,
          0.18
        )
      );

      /* Backpack */
      ctx.fillStyle =
        "#aebdca";

      ctx.beginPath();
      ctx.roundRect(
        -pw / 2 - 4 * scale,
        -ph / 2 + 12 * scale,
        7 * scale,
        25 * scale,
        3 * scale
      );
      ctx.fill();

      /* Main spacesuit body */
      ctx.fillStyle =
        "#f1f5f8";

      ctx.beginPath();
      ctx.roundRect(
        -pw / 2,
        -ph / 2 + 8 * scale,
        pw,
        ph - 8 * scale,
        8 * scale
      );
      ctx.fill();

      /* Suit shadow / lower body */
      ctx.fillStyle =
        "#c8d3dc";

      ctx.beginPath();
      ctx.roundRect(
        -pw / 2 + 2 * scale,
        9 * scale,
        pw - 4 * scale,
        11 * scale,
        5 * scale
      );
      ctx.fill();

      /* Helmet */
      ctx.fillStyle =
        "#eef4f8";

      ctx.beginPath();
      ctx.arc(
        0,
        -12 * scale,
        14 * scale,
        0,
        Math.PI * 2
      );
      ctx.fill();

      /* Helmet rim */
      ctx.strokeStyle =
        "#9eafbc";
      ctx.lineWidth =
        2 * scale;

      ctx.beginPath();
      ctx.arc(
        0,
        -12 * scale,
        14 * scale,
        0,
        Math.PI * 2
      );
      ctx.stroke();

      /* Dark astronaut visor */
      ctx.fillStyle =
        "#243b53";

      ctx.beginPath();
      ctx.roundRect(
        -9.5 * scale,
        -18 * scale,
        19 * scale,
        11 * scale,
        5 * scale
      );
      ctx.fill();

      /* Visor reflection */
      ctx.fillStyle =
        "rgba(157, 229, 255, 0.75)";
      ctx.beginPath();
      ctx.roundRect(
        -6.5 * scale,
        -16.5 * scale,
        5 * scale,
        2 * scale,
        1 * scale
      );
      ctx.fill();

      /* Chest control panel */
      ctx.fillStyle =
        "#d6e1e8";
      ctx.beginPath();
      ctx.roundRect(
        -8 * scale,
        -1 * scale,
        16 * scale,
        10 * scale,
        2 * scale
      );
      ctx.fill();

      /* Control buttons */
      ctx.fillStyle =
        "#65b7d6";
      ctx.beginPath();
      ctx.arc(
        -4 * scale,
        2 * scale,
        1.5 * scale,
        0,
        Math.PI * 2
      );
      ctx.fill();

      ctx.fillStyle =
        "#f5b942";
      ctx.beginPath();
      ctx.arc(
        1 * scale,
        2 * scale,
        1.5 * scale,
        0,
        Math.PI * 2
      );
      ctx.fill();

      ctx.fillStyle =
        "#65b7d6";
      ctx.beginPath();
      ctx.arc(
        5 * scale,
        2 * scale,
        1.5 * scale,
        0,
        Math.PI * 2
      );
      ctx.fill();

      /* Suit belt */
      ctx.fillStyle =
        "#8799a8";
      ctx.fillRect(
        -pw / 2 + 3 * scale,
        8 * scale,
        pw - 6 * scale,
        3 * scale
      );

      /* Boots */
      ctx.fillStyle =
        "#778996";

      ctx.beginPath();
      ctx.roundRect(
        -13 * scale,
        18 * scale,
        10 * scale,
        6 * scale,
        2 * scale
      );
      ctx.roundRect(
        3 * scale,
        18 * scale,
        10 * scale,
        6 * scale,
        2 * scale
      );
      ctx.fill();

      /* Small shoulder patches */
      ctx.fillStyle =
        "#65b7d6";
      ctx.fillRect(
        -pw / 2 + 1 * scale,
        -1 * scale,
        4 * scale,
        7 * scale
      );
      ctx.fillRect(
        pw / 2 - 5 * scale,
        -1 * scale,
        4 * scale,
        7 * scale
      );

      ctx.restore();

      /*
       * Checkpoint flag.
       */
      const checkpoint =
        checkpointRef.current;

      const cx =
        checkpoint.x * scale;

      const cy =
        (checkpoint.y -
          cameraY) *
        scale;

      if (
        cy > -50 &&
        cy < heightPx + 50
      ) {
        ctx.fillStyle =
          "#9de5ff";

        ctx.globalAlpha = 0.55;

        ctx.fillRect(
          cx - 2,
          cy - 35,
          4,
          35
        );

        ctx.globalAlpha = 1;

        ctx.beginPath();

        ctx.moveTo(
          cx,
          cy - 35
        );

        ctx.lineTo(
          cx + 30 * scale,
          cy - 24
        );

        ctx.lineTo(
          cx,
          cy - 13
        );

        ctx.closePath();

        ctx.fill();
      }

      /*
       * Height labels.
       */
      ctx.font = `${12 * Math.max(
        1,
        scale
      )}px Inter, system-ui, sans-serif`;

      ctx.fillStyle =
        "rgba(255,255,255,0.5)";

      for (
        let h = 500;
        h <= 10000;
        h += 500
      ) {
        const worldY =
          595 - h * 10;

        const sy =
          (worldY -
            cameraY) *
          scale;

        if (
          sy > 20 &&
          sy <
            heightPx - 10
        ) {
          ctx.fillText(
            `${h} m`,
            12,
            sy
          );
        }
      }
    };

    const loop = (
      timestamp: number
    ) => {
      const dt = Math.min(
        (timestamp -
          lastTimeRef.current) /
          16.67 || 1,
        2
      );

      lastTimeRef.current =
        timestamp;

      const canvasRect =
        canvas.getBoundingClientRect();

      const scale =
        canvasRect.width /
        WORLD_WIDTH;

      /*
       * Do NOT update the player while paused.
       */
      if (
        !paused &&
        !gameOver
      ) {
        const player =
          playerRef.current;

        const keys =
          keysRef.current;

        const left =
          keys.has("a") ||
          keys.has("arrowleft");

        const right =
          keys.has("d") ||
          keys.has("arrowright");

        /*
         * Horizontal movement.
         */
        if (left) {
          player.vx -=
            (player.grounded
              ? MOVE_ACCEL
              : AIR_ACCEL) *
            dt;
        }

        if (right) {
          player.vx +=
            (player.grounded
              ? MOVE_ACCEL
              : AIR_ACCEL) *
            dt;
        }

        if (!left && !right) {
          player.vx *= Math.pow(
            FRICTION,
            dt
          );
        }

        player.vx = clamp(
          player.vx,
          -MAX_SPEED,
          MAX_SPEED
        );

        const oldX = player.x;

        player.x +=
          player.vx * dt;

        /*
         * Platforms are only solid vertically (landing on top, blocked
         * from below) — there is no side-wall collision. Side walls
         * used to snap the player's x to a platform's edge the moment
         * their body's height band merely overlapped it, which fired
         * constantly while flying or standing near a platform's side
         * and read as an unwanted teleport, not a collision.
         */

        player.x = clamp(
          player.x,
          0,
          WORLD_WIDTH -
            player.width
        );

        /*
         * Vertical movement.
         */
        const oldTop = player.y;

        const oldBottom =
          player.y +
          player.height;

        player.vy +=
          GRAVITY * dt;

        player.vy = Math.min(
          player.vy,
          MAX_FALL_SPEED
        );

        player.y +=
          player.vy * dt;

        const wasGrounded = player.grounded;

        player.grounded = false;

        /*
         * Vertical platform collision: falling onto a platform's top
         * lands the player (below). Moving up is more subtle: fully
         * blocking every platform's underside makes it impossible to
         * ever jump onto the platform directly above you, since
         * reaching its top always means rising through its underside
         * first. But never blocking at all lets the player visibly
         * clip through platforms a jump was never going to reach.
         *
         * The fix: only block a platform on the way up if THIS jump's
         * remaining height can't actually clear its top. That's a
         * real ceiling — the player was never going to land on or
         * pass it, so stopping there is correct. A platform the jump
         * CAN clear is left alone; the player rises through its thin
         * underside band for a moment (normal for this genre) and
         * either lands on top once gravity pulls them back down, or
         * continues past to a higher platform.
         *
         * Horizontal overlap below is checked across the player's whole
         * sideways travel this frame (oldX..player.x), not just the
         * final x. Sideways and vertical movement are resolved
         * separately, so on a fast diagonal frame the player can start
         * the frame over a platform, drift past its edge horizontally,
         * and only THEN cross the platform's y — checking the final x
         * alone would miss the overlap that was true when the crossing
         * actually happened, and the platform would silently fail to
         * catch the player.
         */

        const sweptLeft = Math.min(oldX, player.x);
        const sweptRight =
          Math.max(oldX, player.x) + player.width;

        if (player.vy >= 0) {
          /*
           * A fast fall (no terminal velocity cap — a long enough
           * plunge keeps accelerating) can cross more than one
           * platform's y-band in a single frame. Picking the FIRST
           * match found in array order (roughly bottom-to-top) could
           * land the player on a lower platform than the one they
           * actually reached first, which looks exactly like falling
           * straight through the real one. Instead, scan every
           * candidate and land on whichever has the smallest y — the
           * highest surface, i.e. the first one actually hit.
           */
          let landedPlatform: Platform | null = null;

          for (const platform of platformsRef.current) {
            /*
             * A landing used to register on ANY overlap at all, even a
             * sliver of a pixel where the player is really just
             * falling past a platform's edge, not onto it. Combined
             * with the landing snap pulling the player's whole body
             * onto the platform, that sliver-overlap read as an
             * unwanted teleport sideways onto a platform the player
             * was simply falling next to. Requiring at least half the
             * player's own width to actually overlap means a landing
             * only registers when the player is genuinely coming down
             * on the platform — a bare graze just falls past it.
             */
            const overlapWidth =
              Math.min(
                sweptRight,
                platform.x + platform.width
              ) -
              Math.max(sweptLeft, platform.x);

            const horizontal =
              overlapWidth >= player.width / 2;

            const crossed =
              oldBottom <=
                platform.y &&
              player.y +
                player.height >=
                platform.y;

            if (
              horizontal &&
              crossed &&
              (!landedPlatform ||
                platform.y <
                  landedPlatform.y)
            ) {
              landedPlatform = platform;
            }
          }

          if (landedPlatform) {
            player.y =
              landedPlatform.y -
              player.height;

            player.vy = 0;

            player.grounded = true;

            player.jumpsLeft = 1;

            /*
             * A landing can register while the player's box is only
             * PARTIALLY over the platform (the swept check only needs
             * the path to have touched it, not the final resting
             * spot). Left as-is, that partial overlap — combined with
             * whatever horizontal speed the jump still had — meant a
             * landing could immediately slide off the very platform
             * it just registered on, feeling exactly like falling
             * through solid ground. Pin the player fully onto the
             * platform and cut the carried-over jump speed so a
             * landing is a landing: only the player's own held input
             * can walk them back off it afterward, not leftover
             * momentum from the jump that got them there.
             *
             * Gated on `!wasGrounded` because this landing check
             * re-fires every single frame the player is already
             * standing still (gravity nudges them down a hair, they
             * re-land immediately) — applying this every such frame
             * would trap a standing player in place and turn normal
             * walking-speed into molasses. It should only fire once,
             * on the actual airborne-to-grounded transition.
             */
            if (!wasGrounded) {
              player.x = clamp(
                player.x,
                landedPlatform.x,
                landedPlatform.x +
                  landedPlatform.width -
                  player.width
              );

              player.vx *= 0.2;
            }

            /*
             * Checkpoint every 4 platforms.
             */
            if (
              landedPlatform.id > 0 &&
              landedPlatform.id % 4 === 0
            ) {
              checkpointRef.current =
                {
                  x:
                    landedPlatform.x +
                    landedPlatform.width /
                      2 -
                    player.width / 2,
                  y:
                    landedPlatform.y -
                    player.height,
                };
            }
          }
        } else {
          /*
           * Moving up: a platform is always a solid ceiling, even
           * one the player is trying to land on top of. Landing from
           * directly underneath is not allowed — reaching the top
           * requires jumping up beside it and coming down onto it,
           * not rising straight through the middle.
           *
           * Same reasoning as the landing case above: pick the ceiling
           * with the LARGEST bottom edge (closest below the player),
           * not just the first match in array order, so a fast rise
           * stops at the first real ceiling it reaches.
           */
          let ceilingBottom = -Infinity;
          let hitCeiling = false;

          for (const platform of platformsRef.current) {
            const horizontal =
              sweptRight >
                platform.x &&
              sweptLeft <
                platform.x +
                  platform.width;

            const platformBottom =
              platform.y + platform.height;

            const crossed =
              oldTop >= platformBottom &&
              player.y <= platformBottom;

            if (
              horizontal &&
              crossed &&
              platformBottom >
                ceilingBottom
            ) {
              ceilingBottom =
                platformBottom;

              hitCeiling = true;
            }
          }

          if (hitCeiling) {
            player.y = ceilingBottom;

            player.vy = 0;
          }
        }

        /*
         * Generate more platforms.
         */
        const highestPlatform =
          Math.min(
            ...platformsRef.current.map(
              (p) => p.y
            )
          );

        if (
          highestPlatform >
          cameraYRef.current -
            1100
        ) {
          const seedPlatform =
            platformsRef.current.find(
              (p) => p.y === highestPlatform
            ) ?? null;

          const newPlatforms =
            generatePlatforms(
              highestPlatform,
              10,
              nextPlatformIdRef.current,
              seedPlatform
            );

          nextPlatformIdRef.current +=
            newPlatforms.length;

          platformsRef.current.push(
            ...newPlatforms
          );
        }

        /*
         * Remove platforms far below.
         */
        const cutoff =
          cameraYRef.current +
          VIEW_HEIGHT +
          1000;

        platformsRef.current =
          platformsRef.current.filter(
            (p) => p.y < cutoff
          );

        /*
         * CAMERA FOLLOW
         * ---------------------------------------------------------
         * The camera is centered on the player vertically.
         *
         * The old camera only moved upward, which meant the player
         * could eventually fall below the bottom of the viewport.
         * This version follows the player in BOTH directions.
         *
         * We also add a safety margin: if the player ever gets too
         * close to the top/bottom of the visible area, the camera
         * immediately catches up. This guarantees that the player
         * stays on-screen.
         */
        const viewportWorldHeight =
          canvasRect.height / scale;

        const playerCenterY =
          player.y + player.height / 2;

        const desiredCameraY =
          playerCenterY -
          viewportWorldHeight / 2;

        /*
         * Smooth camera movement while the player is comfortably
         * inside the viewport.
         */
        cameraYRef.current +=
          (desiredCameraY -
            cameraYRef.current) *
          0.16 *
          dt;

        /*
         * HARD SAFETY LIMITS
         * Keep the player's entire body inside the viewport.
         * These checks override smoothing if necessary.
         */
        const screenPlayerTop =
          (player.y -
            cameraYRef.current) *
          scale;

        const screenPlayerBottom =
          (player.y +
            player.height -
            cameraYRef.current) *
          scale;

        const topMargin = 90;
        const bottomMargin =
          Math.min(130, canvasRect.height * 0.22);

        if (screenPlayerTop < topMargin) {
          cameraYRef.current =
            player.y -
            topMargin / scale;
        }

        if (
          screenPlayerBottom >
          canvasRect.height - bottomMargin
        ) {
          cameraYRef.current =
            player.y +
            player.height -
            (canvasRect.height -
              bottomMargin) /
              scale;
        }

        /*
         * Calculate altitude.
         */
        const currentHeight =
          Math.max(
            0,
            Math.floor(
              (595 -
                player.y) /
                10
            )
          );

        if (
          currentHeight >
          maxHeightRef.current
        ) {
          maxHeightRef.current =
            currentHeight;

          setHeight(
            currentHeight
          );

          reportAltitude(currentHeight);
        }

        /*
         * FALLING
         */
        if (
          player.y >
          cameraYRef.current +
            VIEW_HEIGHT +
            160
        ) {
          player.x =
            checkpointRef.current.x;

          player.y =
            checkpointRef.current.y;

          player.vx = 0;
          player.vy = 0;

          player.jumpsLeft = 1;

          setMessage(
            "You fell! Back to your last checkpoint."
          );

          window.setTimeout(() => {
            setMessage("");
          }, 900);
        }

        /*
         * LAVA
         * Rises continuously and speeds up every LAVA_MILESTONE_METERS
         * of altitude reached (using the best height ever hit, not the
         * current one, so it never slows back down if the player drops
         * lower). Touching it is instant death — unlike falling, there
         * is no checkpoint reset to soften it.
         */
        const lavaSpeed =
          LAVA_BASE_SPEED +
          Math.floor(
            maxHeightRef.current /
              LAVA_MILESTONE_METERS
          ) *
            LAVA_SPEED_STEP;

        lavaYRef.current -=
          lavaSpeed * dt;

        if (
          player.y +
            player.height >=
          lavaYRef.current
        ) {
          setDiedInLava(true);
          setGameOver(true);
        }

        /*
         * GAME OVER
         * Once tokens hit 0, jumping is refused, so the run
         * effectively ends once the player falls off-screen.
         */
        if (
          energyRef.current <= 0 &&
          player.y >
            cameraYRef.current +
              VIEW_HEIGHT
        ) {
          setGameOver(true);
        }
      }

      draw(
        context,
        canvasRect.width,
        canvasRect.height,
        scale
      );

      animationRef.current =
        requestAnimationFrame(
          loop
        );
    };

    animationRef.current =
      requestAnimationFrame(loop);

    return () => {
      window.removeEventListener(
        "resize",
        resizeCanvas
      );

      if (
        animationRef.current !==
        null
      ) {
        cancelAnimationFrame(
          animationRef.current
        );
      }
    };
  }, [
    started,
    gameOver,
    paused,
    reportAltitude,
    gameEnergy,
  ]);

  const gameHeight = Math.max(
    0,
    height
  );

  return (
    <div className="sg-summit-shell" style={{ paddingTop: "80px" }}>
      <Navigation />

      {/* HEADER */}
      <div className="sg-summit-header">
        <div>
          <div className="sg-summit-kicker">
            SCIENCEGLIMPSE GAME 1
          </div>

          <h1>
            ScienceGlimpse Summit
          </h1>

          <p>
            Climb higher. Every 10 jumps
            costs 1 token — don't run out.
          </p>
        </div>

        {started && (
          <div className="sg-summit-stats">
            <div className="sg-stat">
              <span>
                ALTITUDE
              </span>

              <strong>
                {gameHeight.toLocaleString()}{" "}
                m
              </strong>
            </div>

            <div className="sg-stat">
              <span>
                BEST
              </span>

              <strong>
                {bestHeight.toLocaleString()}{" "}
                m
              </strong>
            </div>

            <div className="sg-stat sg-energy">
              <span>
                {user ? "ENERGY (TOKENS)" : "ENERGY (PRACTICE)"}
              </span>

              <strong>
                {energy}
              </strong>
            </div>
          </div>
        )}
      </div>

      {/* START SCREEN */}
      {!started ? (
        <div className="sg-summit-start">
          <div className="sg-summit-card">
            <div className="sg-orb">
              🧪
            </div>

            <h2>
              Reach the Summit
            </h2>

            <p>
              Jump across floating
              platforms using your
              ScienceGlimpse tokens as
              energy. Every 10 jumps
              costs 1 token — run out,
              and you can't jump
              anymore.
            </p>

            <div className="sg-controls-grid">
              <div>
                <kbd>A</kbd>
                <kbd>D</kbd>
                <span>
                  Move
                </span>
              </div>

              <div>
                <kbd>
                  SPACE
                </kbd>

                <span>
                  Jump / double jump
                </span>
              </div>

              <div>
                <kbd>
                  P
                </kbd>

                <span>
                  Pause
                </span>
              </div>
            </div>

            <button
              className="sg-primary-button"
              onClick={resetGame}
              disabled={!canStartGame}
            >
              {canStartGame
                ? "Start Climbing"
                : "Loading your tokens..."}
            </button>

            <div className="sg-note">
              Platforms are solid from
              below — jump up beside one
              and land on top, you can't
              rise straight through it.
              Your highest altitude is
              saved on this device.
            </div>

            {user ? (
              <div className="sg-note">
                Signed in — energy starts at
                your real ScienceGlimpse
                token balance
                {gameEnergy.balance !== null
                  ? ` (${gameEnergy.balance})`
                  : ""}
                . Every 10 jumps spends 1 of
                your real tokens.
              </div>
            ) : (
              <div className="sg-note">
                Practice mode — energy here
                isn't tied to real tokens.{" "}
                <Link to="/login">Sign in</Link>{" "}
                to play with your real
                ScienceGlimpse tokens.
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* GAME */}
          <div className="sg-summit-game-wrap">
            <canvas
              ref={canvasRef}
              className="sg-summit-canvas"
            />

            <div className="sg-summit-hint">
              <span>
                A/D
              </span>{" "}
              move&nbsp;&nbsp;

              <span>
                SPACE
              </span>{" "}
              jump
            </div>

            {/* MESSAGE */}
            {message && (
              <div className="sg-summit-toast">
                {message}
              </div>
            )}

            {/* PAUSE */}
            {paused &&
              !gameOver && (
                <div className="sg-summit-overlay">
                  <div className="sg-overlay-card">
                    <h2>
                      Paused
                    </h2>

                    <button
                      className="sg-primary-button"
                      onClick={() =>
                        setPaused(false)
                      }
                    >
                      Resume
                    </button>
                  </div>
                </div>
              )}

            {/* GAME OVER */}
            {gameOver && (
              <div className="sg-summit-overlay">
                <div className="sg-overlay-card">
                  <div className="sg-orb">
                    {diedInLava ? "🌋" : "🏔️"}
                  </div>

                  <h2>
                    {diedInLava
                      ? "Swallowed by the Lava"
                      : "Run Complete"}
                  </h2>

                  <p>
                    You reached{" "}
                    <strong>
                      {gameHeight.toLocaleString()}{" "}
                      m
                    </strong>
                    .
                  </p>

                  <p className="sg-best-line">
                    Best:{" "}
                    {Math.max(
                      bestHeight,
                      gameHeight
                    ).toLocaleString()}{" "}
                    m
                  </p>

                  <button
                    className="sg-primary-button"
                    onClick={
                      resetGame
                    }
                  >
                    Climb Again
                  </button>
                </div>
              </div>
            )}

            {/* MOBILE CONTROLS */}
            <div className="sg-mobile-controls">
              <button
                aria-label="Move left"
                onPointerDown={() =>
                  keysRef.current.add(
                    "arrowleft"
                  )
                }
                onPointerUp={() =>
                  keysRef.current.delete(
                    "arrowleft"
                  )
                }
                onPointerCancel={() =>
                  keysRef.current.delete(
                    "arrowleft"
                  )
                }
              >
                ←
              </button>

              <button
                aria-label="Jump"
                onPointerDown={
                  doJump
                }
              >
                ↑
              </button>

              <button
                aria-label="Move right"
                onPointerDown={() =>
                  keysRef.current.add(
                    "arrowright"
                  )
                }
                onPointerUp={() =>
                  keysRef.current.delete(
                    "arrowright"
                  )
                }
                onPointerCancel={() =>
                  keysRef.current.delete(
                    "arrowright"
                  )
                }
              >
                →
              </button>
            </div>
          </div>

          {/* ACTION BUTTONS */}
          <div className="sg-summit-actions">
            <button
              className="sg-secondary-button"
              onClick={() =>
                setPaused(
                  (value) =>
                    !value
                )
              }
              disabled={gameOver}
            >
              {paused
                ? "▶ Resume"
                : "Ⅱ Pause"}
            </button>

            <button
              className="sg-secondary-button danger"
              onClick={
                resetGame
              }
            >
              ↻ Restart
            </button>
          </div>
        </>
      )}
    </div>
  );
}