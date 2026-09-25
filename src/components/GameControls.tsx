import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Dice } from "./Dice";
import { useSound } from "../hooks/useSound";
import type { RoomState, AnimationPhase, PlayerColor } from "../types/game";

interface GameControlsProps {
  room: RoomState;
  uid: string;
  isMyTurn: boolean;
  canRoll: boolean;
  animationPhase: AnimationPhase;
  onRoll: () => void;
  onDiceAnimationComplete: () => void;
  isSubmitting: boolean;
  rollError: string | null;
}

const COLOR_DOT: Record<string, string> = {
  cyan: "bg-blue-400",
  amber: "bg-red-400",
  emerald: "bg-emerald-400",
  violet: "bg-violet-400",
};

const BORDER_GLOW: Record<string, string> = {
  cyan: "ring-blue-300/50 shadow-blue-200/30",
  amber: "ring-red-300/50 shadow-red-200/30",
  emerald: "ring-emerald-300/50 shadow-emerald-200/30",
  violet: "ring-violet-300/50 shadow-violet-200/30",
};

const TURN_BG: Record<string, string> = {
  cyan: "bg-blue-50 border-blue-200",
  amber: "bg-red-50 border-red-200",
  emerald: "bg-emerald-50 border-emerald-200",
  violet: "bg-violet-50 border-violet-200",
};

const TEXT_COLOR: Record<string, string> = {
  cyan: "text-blue-600",
  amber: "text-red-500",
  emerald: "text-emerald-600",
  violet: "text-violet-600",
};

const GLOW_COLOR: Record<string, string> = {
  cyan: "rgba(100,181,246,0.15)",
  amber: "rgba(255,138,128,0.15)",
  emerald: "rgba(52,211,153,0.15)",
  violet: "rgba(167,139,250,0.15)",
};

const DOT_GLOW: Record<string, string> = {
  cyan: "#64B5F6",
  amber: "#FF8A80",
  emerald: "#34D399",
  violet: "#A78BFA",
};

const WAITING_MESSAGES = [
  "Watching the board...",
  "Waiting for the roll...",
  "Planning the next move...",
];
const WAITING_MESSAGE_COUNT = WAITING_MESSAGES.length + 1;

/** Small inline SVG die face for player card */
function MiniDie({ value }: { value: number }) {
  // Simple 3x3 grid positions for pips
  const pips: Record<number, Array<[number, number]>> = {
    1: [[1, 1]],
    2: [[0, 0], [2, 2]],
    3: [[0, 0], [1, 1], [2, 2]],
    4: [[0, 0], [2, 0], [0, 2], [2, 2]],
    5: [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]],
    6: [[0, 0], [2, 0], [0, 1], [2, 1], [0, 2], [2, 2]],
  };

  const dots = pips[value] ?? pips[1];

  return (
    <svg viewBox="0 0 20 20" className="w-6 h-6 flex-shrink-0">
      <rect x="1" y="1" width="18" height="18" rx="3" fill="#FFF8F0" stroke="#D7CCC8" strokeWidth="0.8" />
      {dots.map(([col, row], i) => (
        <circle
          key={i}
          cx={5 + col * 5}
          cy={5 + row * 5}
          r="1.8"
          fill="#5D4037"
        />
      ))}
    </svg>
  );
}

export function GameControls({
  room,
  uid,
  isMyTurn,
  canRoll,
  animationPhase,
  onRoll,
  onDiceAnimationComplete,
  isSubmitting,
  rollError,
}: GameControlsProps) {
  const isRolling = animationPhase === "rolling";
  const { play } = useSound();
  const prevTurnRef = useRef(isMyTurn);
  const [waitingMessageIndex, setWaitingMessageIndex] = useState(0);

  // Play turn ding when it becomes my turn
  useEffect(() => {
    if (isMyTurn && !prevTurnRef.current) {
      play("turnDing");
    }
    prevTurnRef.current = isMyTurn;
  }, [isMyTurn, play]);

  useEffect(() => {
    if (isMyTurn || animationPhase !== "idle") {
      return;
    }

    const interval = setInterval(() => {
      setWaitingMessageIndex((current) => (current + 1) % WAITING_MESSAGE_COUNT);
    }, 2400);
    return () => clearInterval(interval);
  }, [isMyTurn, animationPhase]);

  const lastDice = animationPhase === "rolling" ? null : (room.lastMove?.diceValue ?? null);
  const playerUids = Object.keys(room.players);
  const displayedTurnUid =
    animationPhase !== "idle" && room.lastMove
      ? room.lastMove.playerId
      : room.turn;
  const currentTurnColor = room.players[displayedTurnUid]?.color ?? "cyan";
  const currentTurnName =
    room.players[displayedTurnUid]?.displayName ?? "Player";
  const myColor = room.players[uid]?.color ?? "cyan";
  const isDisplayedMyTurn = displayedTurnUid === uid;
  const effectiveWaitingMessageIndex =
    isDisplayedMyTurn || animationPhase !== "idle" ? 0 : waitingMessageIndex;
  const movingTarget =
    animationPhase !== "rolling" && animationPhase !== "idle"
      ? room.lastMove
      : null;
  const pendingMove =
    animationPhase === "rolling" || animationPhase === "moving"
      ? room.lastMove
      : null;
  const turnColor = currentTurnColor;
  const bonusReady =
    (animationPhase === "idle" || animationPhase === "done") &&
    room.lastMove?.bonusRoll &&
    room.turn === room.lastMove.playerId;
  const turnLabel = bonusReady
    ? "Bonus Roll!"
    : isDisplayedMyTurn
      ? "Your Turn"
      : effectiveWaitingMessageIndex === 0
        ? `${currentTurnName}'s Turn`
        : WAITING_MESSAGES[effectiveWaitingMessageIndex - 1];
  const streakLabel =
    (room.lastMove?.bonusStreak ?? 0) >= 2
      ? `Bonus x${room.lastMove?.bonusStreak}`
      : (room.lastMove?.ladderStreak ?? 0) >= 2
        ? `Ladder x${room.lastMove?.ladderStreak}`
        : null;

  return (
    <div className="game-controls w-full max-w-[500px] mx-auto flex flex-col items-center">
      {/* Turn Indicator */}
      <div
        className={`w-full rounded-xl overflow-hidden transition-all duration-500 border-2 ${
          TURN_BG[turnColor]
        } ${isDisplayedMyTurn ? "turn-banner-active" : ""}`}
        style={{
          boxShadow: isDisplayedMyTurn
            ? `0 0 16px ${GLOW_COLOR[myColor]}`
            : "none",
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={isMyTurn ? "my-turn" : "their-turn"}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="turn-banner-content px-4 flex items-center justify-center gap-2"
          >
            <span className="text-lg">🎲</span>
            <span
              className={`text-base font-bold transition-colors duration-300 ${
                isDisplayedMyTurn
                  ? TEXT_COLOR[myColor]
                  : "text-stone-400"
              }`}
            >
              {turnLabel}
            </span>
            {streakLabel && (animationPhase === "idle" || animationPhase === "done") && (
              <span className="text-xs font-bold text-stone-500">
                {streakLabel}
              </span>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Player info */}
      <div className="player-grid w-full grid grid-cols-2">
        {playerUids.map((playerUid, index) => {
          const player = room.players[playerUid];
          return (
            <PlayerCard
              key={playerUid}
              name={player.displayName}
              color={player.color}
              position={
                pendingMove?.playerId === playerUid
                  ? pendingMove.from
                  : (room.positions[playerUid] ?? 0)
              }
              isActive={displayedTurnUid === playerUid}
              label={playerUid === uid ? "You" : `Player ${index + 1}`}
              connected={playerUid === uid ? true : player.connected}
              lastDice={lastDice}
              isRoller={room.lastMove?.playerId === playerUid}
              wins={room.winCounts?.[playerUid] ?? 0}
              targetPosition={
                movingTarget?.playerId === playerUid ? movingTarget.to : null
              }
            />
          );
        })}
      </div>

      {/* Dice + Roll Button */}
      <div className="dice-row flex items-center">
        <Dice
          lastMove={room.lastMove}
          isRolling={isRolling}
          onRollComplete={onDiceAnimationComplete}
        />

        <div className="flex flex-col items-center gap-1">
          <motion.button
            whileHover={canRoll ? { scale: 1.05 } : {}}
            whileTap={canRoll ? { scale: 0.94 } : {}}
            onClick={onRoll}
            disabled={!canRoll}
            className={`roll-button py-3.5 px-8 rounded-xl font-bold text-white text-lg
              transition-all duration-200 cursor-pointer min-h-[48px]
              ${
                canRoll
                  ? `bg-gradient-to-r from-amber-500 to-orange-500
                     hover:from-amber-400 hover:to-orange-400
                     shadow-lg shadow-amber-400/25
                     ${myColor === "cyan" ? "animate-pulse-glow-cyan" : "animate-pulse-glow-amber"}`
                  : "bg-stone-200 text-stone-400 cursor-not-allowed shadow-none"
              }`}
          >
            {isRolling || isSubmitting
              ? "Rolling..."
              : animationPhase === "moving"
                ? "Moving..."
                : animationPhase === "done"
                  ? "Bonus Roll!"
                  : canRoll
                  ? "🎲 Roll Dice"
                  : "Wait..."}
          </motion.button>
          
          <AnimatePresence>
            {rollError && (
              <motion.div 
                initial={{ opacity: 0, y: -5 }} 
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-xs text-red-500 font-semibold px-2 text-center"
              >
                {rollError}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function PlayerCard({
  name,
  color,
  position,
  isActive,
  label,
  connected,
  lastDice,
  isRoller,
  wins,
  targetPosition,
}: {
  name: string;
  color: PlayerColor;
  position: number;
  isActive: boolean;
  label: string;
  connected: boolean;
  lastDice: number | null;
  isRoller: boolean;
  wins: number;
  targetPosition: number | null;
}) {
  return (
    <div
      className={`player-card glass-card px-3 py-2.5 flex items-center gap-2.5 transition-all duration-300 ${
        isActive
          ? `ring-2 ${BORDER_GLOW[color]} shadow-lg`
          : "opacity-60"
      }`}
    >
      {/* Color dot */}
      <div className="relative">
        <div
          className={`w-4 h-4 rounded-full ${COLOR_DOT[color]} ${
            isActive ? "shadow-md" : ""
          }`}
          style={
            isActive
              ? {
                  boxShadow: `0 0 8px ${DOT_GLOW[color]}55`,
                }
              : undefined
          }
        />
        {!connected && (
          <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500" />
        )}
      </div>

      {/* Name + label */}
      <div className="min-w-0 flex-1">
        <div className="text-xs text-stone-400 font-medium">{label}</div>
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="text-sm font-semibold text-stone-800 truncate">
            {name}
          </div>
          {targetPosition !== null && (
            <div className="text-[11px] font-bold text-amber-600 flex-shrink-0">
              → {targetPosition}
            </div>
          )}
        </div>
        <div className="text-[11px] text-stone-400 font-medium">
          Wins {wins}
        </div>
      </div>

      {/* Last dice + position */}
      <div className="flex items-center gap-1.5">
        {lastDice && isRoller && <MiniDie value={lastDice} />}
        <div className="text-xs text-stone-500 font-mono tabular-nums min-w-[24px] text-right font-bold">
          {position > 0 ? position : "—"}
        </div>
      </div>
    </div>
  );
}
