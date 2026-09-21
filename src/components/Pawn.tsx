import { useEffect, useRef, useCallback } from "react";
import { useAnimate } from "motion/react";
import { getSquarePixelPosition } from "../lib/game/board";
import { useReducedMotion } from "../hooks/useReducedMotion";
import type { LastMove, PlayerColor } from "../types/game";

interface PawnProps {
  playerId: string;
  position: number;
  color: PlayerColor;
  boardSize: number;
  lastMove: LastMove | null;
  animationPhase: "idle" | "rolling" | "moving" | "done";
  onMoveComplete: () => void;
  isActiveTurn?: boolean;
  onSquareVisited?: (square: number) => void;
}

/** Body + outline colors for the cute blob characters */
const BODY_COLORS: Record<PlayerColor, { fill: string; stroke: string; light: string }> = {
  cyan: { fill: "#64B5F6", stroke: "#1E88E5", light: "#BBDEFB" },
  amber: { fill: "#FF8A80", stroke: "#E53935", light: "#FFCDD2" },
};

const GLOW_CLASS: Record<PlayerColor, string> = {
  cyan: "pawn-active-cyan",
  amber: "pawn-active-amber",
};

export function Pawn({
  playerId,
  position,
  color,
  boardSize,
  lastMove,
  animationPhase,
  onMoveComplete,
  isActiveTurn = false,
  onSquareVisited,
}: PawnProps) {
  const [scope, animate] = useAnimate<HTMLDivElement>();
  const reducedMotion = useReducedMotion();
  const isAnimating = useRef(false);
  // Initialize to the actual position prop so we don't desync on mount/refresh
  const currentVisualPos = useRef(position);
  const lastAnimatedTimestamp = useRef(0);

  const pawnSize = Math.max(Math.round(boardSize / 20), 18);
  const offset = color === "cyan" ? -pawnSize * 0.3 : pawnSize * 0.3;

  const toPixels = useCallback(
    (square: number) => {
      if (square <= 0) {
        const cell = boardSize / 10;
        return { x: cell * 0.5 + offset, y: boardSize + cell * 0.3 };
      }
      const pos = getSquarePixelPosition(square, boardSize);
      return { x: pos.x + offset, y: pos.y };
    },
    [boardSize, offset],
  );

  // Set initial position on mount / board resize
  // Does NOT depend on `position` — only runs when layout changes
  useEffect(() => {
    if (!scope.current || boardSize <= 0) return;
    // Don't interrupt ongoing animations
    if (isAnimating.current) return;

    const { x, y } = toPixels(currentVisualPos.current);
    void animate(
      scope.current,
      {
        x: x - pawnSize / 2,
        y: y - pawnSize / 2,
        opacity: currentVisualPos.current > 0 ? 1 : 0.5,
      },
      { duration: 0 },
    );
  }, [boardSize, animate, scope, toPixels, pawnSize]);

  // Animate when moving phase triggers
  useEffect(() => {
    if (animationPhase !== "moving") return;
    if (!lastMove || lastMove.playerId !== playerId) return;
    if (lastMove.timestamp <= lastAnimatedTimestamp.current) return;
    if (isAnimating.current) return;
    if (!scope.current || boardSize <= 0) return;

    lastAnimatedTimestamp.current = lastMove.timestamp;
    isAnimating.current = true;

    async function runAnimation() {
      const el = scope.current;
      if (!el) {
        isAnimating.current = false;
        onMoveComplete();
        return;
      }

      // Fade in if coming from off-board
      if (currentVisualPos.current === 0 && lastMove!.from === 0) {
        await animate(el, { opacity: 1 }, { duration: 0.2 });
      }

      if (lastMove!.noMove) {
        const base = toPixels(currentVisualPos.current);
        const bx = base.x - pawnSize / 2;
        if (!reducedMotion) {
          await animate(
            el,
            { x: [bx - 4, bx + 4, bx - 3, bx + 3, bx] },
            { duration: 0.3 },
          );
        }
        isAnimating.current = false;
        onMoveComplete();
        return;
      }

      // Phase 1: Move square-by-square with hop arc
      const stepDuration = reducedMotion ? 0 : 0.1;
      for (let sq = lastMove!.from + 1; sq <= lastMove!.intermediate; sq++) {
        const { x, y } = toPixels(sq);
        onSquareVisited?.(sq);
        if (!reducedMotion) {
          await animate(
            el,
            {
              x: x - pawnSize / 2,
              y: [undefined, y - pawnSize / 2 - pawnSize * 0.5, y - pawnSize / 2],
              scaleY: [1, 0.92, 1], // Slight squash on landing
            },
            { duration: stepDuration, ease: "easeOut" },
          );
        } else {
          await animate(el, { x: x - pawnSize / 2, y: y - pawnSize / 2 }, { duration: 0 });
        }
      }
      currentVisualPos.current = lastMove!.intermediate;

      // Phase 2: Snake or ladder
      if (lastMove!.hitLadder !== null) {
        onSquareVisited?.(lastMove!.to);
        const { x, y } = toPixels(lastMove!.to);
        await animate(
          el,
          { x: x - pawnSize / 2, y: y - pawnSize / 2 },
          {
            duration: reducedMotion ? 0 : 0.55,
            ease: [0.34, 1.4, 0.64, 1],
          },
        );
        currentVisualPos.current = lastMove!.to;
      } else if (lastMove!.hitSnake !== null) {
        onSquareVisited?.(lastMove!.to);
        const { x, y } = toPixels(lastMove!.to);
        const midX =
          (toPixels(lastMove!.intermediate).x + x) / 2 +
          (Math.random() > 0.5 ? 8 : -8);
        if (!reducedMotion) {
          await animate(
            el,
            {
              x: [undefined, midX - pawnSize / 2, x - pawnSize / 2],
              y: y - pawnSize / 2,
            },
            { duration: 0.4, ease: "easeIn" },
          );
        } else {
          await animate(el, { x: x - pawnSize / 2, y: y - pawnSize / 2 }, { duration: 0 });
        }
        currentVisualPos.current = lastMove!.to;
      }

      isAnimating.current = false;
      onMoveComplete();
    }

    void runAnimation();
  }, [
    animationPhase, lastMove, playerId, animate, scope,
    boardSize, pawnSize, toPixels, reducedMotion, onMoveComplete, onSquareVisited,
  ]);

  // Sync position when idle and not animating
  // This catches any desync — e.g. after opponent's move completes,
  // or if Firebase position drifted from visual position
  useEffect(() => {
    if (isAnimating.current) return;
    if (animationPhase !== "idle") return;

    // PREVENT SNAP BUG: If there's an unseen move for this player, wait for it to animate.
    // This prevents the pawn from jumping to its final position before the dice roll completes.
    if (lastMove && lastMove.playerId === playerId && lastMove.timestamp > lastAnimatedTimestamp.current) {
      return;
    }

    if (currentVisualPos.current === position) return;
    if (!scope.current || boardSize <= 0) return;

    // SAFEGUARD: Guard against invalid positions from Firebase
    if (position < 0 || position > 100 || isNaN(position)) {
      console.error(`[Pawn] Invalid position from Firebase for ${playerId}: ${position}. Keeping at ${currentVisualPos.current}.`);
      return;
    }

    currentVisualPos.current = position;
    const { x, y } = toPixels(position);
    void animate(
      scope.current,
      { x: x - pawnSize / 2, y: y - pawnSize / 2, opacity: position > 0 ? 1 : 0.5 },
      { duration: 0.25 },
    );
  }, [position, animationPhase, animate, scope, toPixels, pawnSize, boardSize, lastMove, playerId]);

  const colors = BODY_COLORS[color];

  return (
    <div
      ref={scope}
      className="absolute top-0 left-0 z-10"
      style={{
        width: pawnSize,
        height: pawnSize,
        opacity: 0.5,
      }}
    >
      <div className={`w-full h-full ${isActiveTurn ? GLOW_CLASS[color] : ""}`}>
        {/* Cute blob character rendered as SVG */}
        <svg viewBox="0 0 40 40" className="w-full h-full" style={{ filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.25))" }}>
          {/* Body */}
          <circle cx="20" cy="21" r="15" fill={colors.fill} stroke={colors.stroke} strokeWidth="1.5" />
          {/* Highlight/shine on body */}
          <circle cx="14" cy="15" r="5" fill={colors.light} opacity="0.5" />
          {/* Left eye white */}
          <ellipse cx="14" cy="19" rx="3.5" ry="4" fill="white" />
          {/* Right eye white */}
          <ellipse cx="26" cy="19" rx="3.5" ry="4" fill="white" />
          {/* Left pupil */}
          <circle cx="15" cy="20" r="2" fill="#333" />
          {/* Right pupil */}
          <circle cx="27" cy="20" r="2" fill="#333" />
          {/* Eye shine */}
          <circle cx="13.5" cy="18" r="1" fill="white" />
          <circle cx="25.5" cy="18" r="1" fill="white" />
          {/* Smile */}
          <path d="M 14 27 Q 20 32 26 27" fill="none" stroke="#333" strokeWidth="1.3" strokeLinecap="round" />
          {/* Rosy cheeks */}
          <circle cx="10" cy="25" r="2.5" fill={color === "cyan" ? "#FFCDD2" : "#FFE0B2"} opacity="0.5" />
          <circle cx="30" cy="25" r="2.5" fill={color === "cyan" ? "#FFCDD2" : "#FFE0B2"} opacity="0.5" />
        </svg>
      </div>
    </div>
  );
}
