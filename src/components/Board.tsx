import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import {
  getBoardRows,
  getSquarePosition,
  LADDERS,
  SNAKES,
} from "../lib/game/board";
import { Pawn } from "./Pawn";
import type { LastMove, PlayerColor, AnimationPhase } from "../types/game";

interface BoardProps {
  positions: Record<string, number>;
  playerColors: Record<string, PlayerColor>;
  playerUids: string[];
  lastMove: LastMove | null;
  animationPhase: AnimationPhase;
  onMoveComplete: () => void;
  currentTurnUid?: string;
}

const SPECIAL_SQUARES = new Map<number, "snake" | "ladder">();
for (const sq of Object.keys(SNAKES)) SPECIAL_SQUARES.set(Number(sq), "snake");
for (const sq of Object.keys(LADDERS)) SPECIAL_SQUARES.set(Number(sq), "ladder");

/**
 * Generate a unique curvy snake path with multiple S-bends.
 * Each snake gets a different seed-based variation.
 */
function generateSnakePath(
  x1: number, y1: number,
  x2: number, y2: number,
  seed: number,
): string {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  const perpX = -dy / len;
  const perpY = dx / len;

  // 4-6 curves, varying by seed
  const curves = 3 + (seed % 3);
  const points: Array<{ x: number; y: number }> = [{ x: x1, y: y1 }];

  for (let i = 1; i <= curves; i++) {
    const t = i / (curves + 1);
    const baseX = x1 + dx * t;
    const baseY = y1 + dy * t;
    // Alternating direction with seed-based amplitude variation
    const amp = (5 + (seed * 3 + i * 7) % 6) * (i % 2 === 0 ? 1 : -1);
    points.push({
      x: baseX + perpX * amp,
      y: baseY + perpY * amp,
    });
  }
  points.push({ x: x2, y: y2 });

  // Build smooth cubic bezier path through all points
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cpx1 = prev.x + (curr.x - prev.x) * 0.5 + perpX * ((seed + i) % 5 - 2);
    const cpy1 = prev.y + (curr.y - prev.y) * 0.3;
    const cpx2 = prev.x + (curr.x - prev.x) * 0.5 - perpX * ((seed + i) % 4 - 1.5);
    const cpy2 = prev.y + (curr.y - prev.y) * 0.7;
    d += ` C ${cpx1} ${cpy1}, ${cpx2} ${cpy2}, ${curr.x} ${curr.y}`;
  }
  return d;
}

/** Snake color variations based on seed */
const SNAKE_COLORS: Array<[string, string]> = [
  ["#4CAF50", "#2E7D32"],  // green
  ["#26A69A", "#00796B"],  // teal
  ["#66BB6A", "#388E3C"],  // lime-green
  ["#009688", "#00695C"],  // dark teal
  ["#8BC34A", "#558B2F"],  // yellow-green
  ["#43A047", "#1B5E20"],  // forest green
  ["#ef5350", "#c62828"],  // red snake (rare)
  ["#5C6BC0", "#283593"],  // indigo snake
  ["#7CB342", "#33691E"],  // olive
  ["#00897B", "#004D40"],  // deep teal
];

export function Board({
  positions,
  playerColors,
  playerUids,
  lastMove,
  animationPhase,
  onMoveComplete,
  currentTurnUid,
}: BoardProps) {
  const boardRef = useRef<HTMLDivElement>(null);
  const [boardSize, setBoardSize] = useState(0);
  const [highlightedSquares, setHighlightedSquares] = useState<Set<number>>(new Set());
  const highlightTimers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    if (!boardRef.current) return;
    const observer = new ResizeObserver((entries) => {
      setBoardSize(entries[0].contentRect.width);
    });
    observer.observe(boardRef.current);
    return () => observer.disconnect();
  }, []);

  // Highlight squares when pawns pass through
  const highlightSquare = useCallback((square: number) => {
    setHighlightedSquares((prev) => new Set(prev).add(square));

    // Clear existing timer for this square
    const existing = highlightTimers.current.get(square);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(() => {
      setHighlightedSquares((prev) => {
        const next = new Set(prev);
        next.delete(square);
        return next;
      });
      highlightTimers.current.delete(square);
    }, 400);
    highlightTimers.current.set(square, timer);
  }, []);

  // Cleanup timers on unmount
  useEffect(() => {
    const timers = highlightTimers.current;
    return () => {
      timers.forEach(clearTimeout);
    };
  }, []);

  const rows = useMemo(() => getBoardRows(), []);

  // Get current moving player's color for tile highlight
  const movingPlayerColor = lastMove?.playerId
    ? playerColors[lastMove.playerId]
    : undefined;

  const highlightColor = movingPlayerColor === "amber"
    ? "rgba(255, 138, 128, 0.5)"
    : "rgba(100, 181, 246, 0.5)";

  return (
    <div className="w-full max-w-[500px] mx-auto">
      <div className="board-frame">
        <div
          ref={boardRef}
          className="relative aspect-square w-full board-surface"
        >
          {/* Grid of squares */}
          <div className="grid grid-cols-10 grid-rows-10 w-full h-full">
            {rows.flat().map((square) => {
              const { row, col } = getSquarePosition(square);
              const isDark = (row + col) % 2 === 1;
              const special = SPECIAL_SQUARES.get(square);
              const isHighlighted = highlightedSquares.has(square);

              let tileStyle: React.CSSProperties;
              if (special === "snake") {
                tileStyle = {
                  background: isDark
                    ? "linear-gradient(135deg, #FFCDD2 0%, #FFBCBC 100%)"
                    : "linear-gradient(135deg, #FFE0E0 0%, #FFD4D4 100%)",
                };
              } else if (special === "ladder") {
                tileStyle = {
                  background: isDark
                    ? "linear-gradient(135deg, #C8E6C9 0%, #A5D6A7 100%)"
                    : "linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 100%)",
                };
              } else {
                tileStyle = {
                  background: isDark
                    ? "linear-gradient(135deg, #FFD8A8 0%, #FFCC80 100%)"
                    : "linear-gradient(135deg, #FFF5E6 0%, #FFECD2 100%)",
                };
              }

              const shimmerClass = special === "snake"
                ? "tile-snake-shimmer"
                : special === "ladder"
                  ? "tile-ladder-shimmer"
                  : "";

              return (
                <div
                  key={square}
                  className={`flex items-start justify-start p-[2px] relative ${shimmerClass} ${isHighlighted ? "tile-highlight" : ""}`}
                  style={{
                    ...tileStyle,
                    borderRadius: "3px",
                    border: "0.5px solid rgba(139, 105, 20, 0.15)",
                    boxShadow: "inset 0 0 0 0.5px rgba(255,255,255,0.3)",
                    ...(isHighlighted ? { "--highlight-color": highlightColor } as React.CSSProperties : {}),
                  }}
                >
                  <span
                    className="text-[7px] sm:text-[9px] font-extrabold leading-none select-none"
                    style={{ color: "rgba(93, 64, 55, 0.6)" }}
                  >
                    {square}
                  </span>
                </div>
              );
            })}
          </div>

          {/* SVG overlay for snakes & ladders */}
          <svg
            viewBox="0 0 100 100"
            className="absolute inset-0 w-full h-full pointer-events-none"
          >
            <defs>
              {/* Snake gradients */}
              {Object.keys(SNAKES).map((headStr, i) => {
                const [c1, c2] = SNAKE_COLORS[i % SNAKE_COLORS.length];
                return (
                  <linearGradient key={`sg-${headStr}`} id={`snake-grad-${headStr}`} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor={c1} />
                    <stop offset="100%" stopColor={c2} />
                  </linearGradient>
                );
              })}
              {/* Ladder gradient */}
              <linearGradient id="ladder-rail-g" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#C49A6C" />
                <stop offset="50%" stopColor="#A0522D" />
                <stop offset="100%" stopColor="#8B6914" />
              </linearGradient>
              <linearGradient id="ladder-rung-g" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#DEB887" />
                <stop offset="100%" stopColor="#C49A6C" />
              </linearGradient>
            </defs>

            {/* Ladders */}
            {Object.entries(LADDERS).map(([bottomStr, top], idx) => {
              const bottom = Number(bottomStr);
              const from = getSquarePosition(bottom);
              const to = getSquarePosition(top);
              const x1 = from.col * 10 + 5;
              const y1 = (9 - from.row) * 10 + 5;
              const x2 = to.col * 10 + 5;
              const y2 = (9 - to.row) * 10 + 5;

              const dx = x2 - x1;
              const dy = y2 - y1;
              const len = Math.sqrt(dx * dx + dy * dy);
              const px = -dy / len;
              const py = dx / len;
              const w = 2.0;
              const rungs = Math.max(3, Math.round(len / 10));
              // Slight random tilt for cartoon feel
              const tilt = (idx % 3 - 1) * 0.8;

              return (
                <g key={`ladder-${bottom}`} opacity={0.88} transform={`rotate(${tilt}, ${(x1+x2)/2}, ${(y1+y2)/2})`}>
                  {/* Rail shadows */}
                  <line x1={x1 + px * w + 0.4} y1={y1 + py * w + 0.4} x2={x2 + px * w + 0.4} y2={y2 + py * w + 0.4} stroke="rgba(0,0,0,0.1)" strokeWidth="1.6" strokeLinecap="round" />
                  <line x1={x1 - px * w + 0.4} y1={y1 - py * w + 0.4} x2={x2 - px * w + 0.4} y2={y2 - py * w + 0.4} stroke="rgba(0,0,0,0.1)" strokeWidth="1.6" strokeLinecap="round" />
                  {/* Rails */}
                  <line x1={x1 + px * w} y1={y1 + py * w} x2={x2 + px * w} y2={y2 + py * w} stroke="url(#ladder-rail-g)" strokeWidth="1.3" strokeLinecap="round" />
                  <line x1={x1 - px * w} y1={y1 - py * w} x2={x2 - px * w} y2={y2 - py * w} stroke="url(#ladder-rail-g)" strokeWidth="1.3" strokeLinecap="round" />
                  {/* Rungs */}
                  {Array.from({ length: rungs }, (_, i) => {
                    const t = (i + 1) / (rungs + 1);
                    const rx = x1 + t * dx;
                    const ry = y1 + t * dy;
                    return (
                      <g key={i}>
                        <line x1={rx + px * w + 0.2} y1={ry + py * w + 0.2} x2={rx - px * w + 0.2} y2={ry - py * w + 0.2} stroke="rgba(0,0,0,0.08)" strokeWidth="0.9" strokeLinecap="round" />
                        <line x1={rx + px * w} y1={ry + py * w} x2={rx - px * w} y2={ry - py * w} stroke="url(#ladder-rung-g)" strokeWidth="0.8" strokeLinecap="round" />
                      </g>
                    );
                  })}
                  {/* Nail dots */}
                  <circle cx={x1 + px * w} cy={y1 + py * w} r="0.7" fill="#8B6914" />
                  <circle cx={x1 - px * w} cy={y1 - py * w} r="0.7" fill="#8B6914" />
                  <circle cx={x2 + px * w} cy={y2 + py * w} r="0.7" fill="#8B6914" />
                  <circle cx={x2 - px * w} cy={y2 - py * w} r="0.7" fill="#8B6914" />
                </g>
              );
            })}

            {/* Snakes */}
            {Object.entries(SNAKES).map(([headStr, tail], idx) => {
              const head = Number(headStr);
              const from = getSquarePosition(head);
              const to = getSquarePosition(tail);
              const x1 = from.col * 10 + 5;
              const y1 = (9 - from.row) * 10 + 5;
              const x2 = to.col * 10 + 5;
              const y2 = (9 - to.row) * 10 + 5;

              const snakePath = generateSnakePath(x1, y1, x2, y2, head + idx * 7);
              const headAngle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);

              return (
                <g key={`snake-${head}`} opacity={0.82}>
                  {/* Body shadow */}
                  <path d={snakePath} fill="none" stroke="rgba(0,0,0,0.12)" strokeWidth="3.5" strokeLinecap="round" transform="translate(0.4, 0.4)" />
                  {/* Body main */}
                  <path d={snakePath} fill="none" stroke={`url(#snake-grad-${headStr})`} strokeWidth="2.8" strokeLinecap="round" />
                  {/* Belly highlight */}
                  <path d={snakePath} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.0" strokeLinecap="round" />
                  {/* Scale texture */}
                  <path d={snakePath} fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth="2.8" strokeLinecap="round" strokeDasharray="1.5 2.5" />

                  {/* Head */}
                  <g transform={`translate(${x1}, ${y1}) rotate(${headAngle})`}>
                    {/* Head shape — wider oval */}
                    <ellipse cx="0" cy="0" rx="2.5" ry="1.8" fill={SNAKE_COLORS[idx % SNAKE_COLORS.length][0]} stroke={SNAKE_COLORS[idx % SNAKE_COLORS.length][1]} strokeWidth="0.4" />
                    {/* Eyes */}
                    <circle cx="-0.5" cy="-1.0" r="0.6" fill="white" />
                    <circle cx="-0.5" cy="1.0" r="0.6" fill="white" />
                    <circle cx="-0.3" cy="-1.0" r="0.25" fill="#1a1a1a" />
                    <circle cx="-0.3" cy="1.0" r="0.25" fill="#1a1a1a" />
                    {/* Tongue */}
                    <line x1="2.2" y1="0" x2="3.5" y2="-0.6" stroke="#ef5350" strokeWidth="0.3" strokeLinecap="round" />
                    <line x1="2.2" y1="0" x2="3.5" y2="0.6" stroke="#ef5350" strokeWidth="0.3" strokeLinecap="round" />
                  </g>

                  {/* Tapered tail */}
                  <circle cx={x2} cy={y2} r="0.6" fill={SNAKE_COLORS[idx % SNAKE_COLORS.length][1]} />
                </g>
              );
            })}
          </svg>

          {/* Pawns */}
          {boardSize > 0 && (
            <div className="absolute inset-0 pointer-events-none z-10">
              {playerUids.map((uid) => (
                <Pawn
                  key={uid}
                  playerId={uid}
                  position={positions[uid] ?? 0}
                  color={playerColors[uid] ?? "cyan"}
                  boardSize={boardSize}
                  lastMove={lastMove}
                  animationPhase={animationPhase}
                  onMoveComplete={
                    lastMove?.playerId === uid ? onMoveComplete : () => {}
                  }
                  isActiveTurn={currentTurnUid === uid}
                  onSquareVisited={highlightSquare}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
