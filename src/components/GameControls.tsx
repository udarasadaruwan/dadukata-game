import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Dice } from "./Dice";
import { useSound } from "../hooks/useSound";
import type { RoomState, AnimationPhase } from "../types/game";

interface GameControlsProps {
  room: RoomState;
  uid: string;
  isMyTurn: boolean;
  canRoll: boolean;
  animationPhase: AnimationPhase;
  myColor: "cyan" | "amber";
  opponentColor: "cyan" | "amber";
  myDisplayName: string;
  opponentDisplayName: string;
  myPosition: number;
  opponentPosition: number;
  onRoll: () => void;
  onDiceAnimationComplete: () => void;
  isSubmitting: boolean;
  rollError: string | null;
}

const COLOR_DOT: Record<string, string> = {
  cyan: "bg-blue-400",
  amber: "bg-red-400",
};

const BORDER_GLOW: Record<string, string> = {
  cyan: "ring-blue-300/50 shadow-blue-200/30",
  amber: "ring-red-300/50 shadow-red-200/30",
};

const TURN_BG: Record<string, string> = {
  cyan: "bg-blue-50 border-blue-200",
  amber: "bg-red-50 border-red-200",
};

const WAITING_MESSAGES = [
  "Opponent's Turn",
  "Watching the board...",
  "Waiting for the roll...",
];

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
  myColor,
  opponentColor,
  myDisplayName,
  opponentDisplayName,
  myPosition,
  opponentPosition,
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
      setWaitingMessageIndex((current) => (current + 1) % WAITING_MESSAGES.length);
    }, 2400);
    return () => clearInterval(interval);
  }, [isMyTurn, animationPhase]);

  const lastDice = animationPhase === "rolling" ? null : (room.lastMove?.diceValue ?? null);
  const opponentUid = Object.keys(room.players).find((id) => id !== uid) ?? null;
  const effectiveWaitingMessageIndex =
    isMyTurn || animationPhase !== "idle" ? 0 : waitingMessageIndex;
  const turnColor = isMyTurn ? myColor : opponentColor;
  const bonusReady =
    (animationPhase === "idle" || animationPhase === "done") &&
    room.lastMove?.bonusRoll &&
    room.turn === room.lastMove.playerId;
  const turnLabel = bonusReady
    ? "Bonus Roll!"
    : isMyTurn
      ? "Your Turn"
      : WAITING_MESSAGES[effectiveWaitingMessageIndex];
  const streakLabel =
    (room.lastMove?.bonusStreak ?? 0) >= 2
      ? `Bonus x${room.lastMove?.bonusStreak}`
      : (room.lastMove?.ladderStreak ?? 0) >= 2
        ? `Ladder x${room.lastMove?.ladderStreak}`
        : null;

  return (
    <div className="w-full max-w-[500px] mx-auto flex flex-col items-center gap-3">
      {/* Turn Indicator */}
      <div
        className={`w-full rounded-xl overflow-hidden transition-all duration-500 border-2 ${
          TURN_BG[turnColor]
        } ${isMyTurn ? "turn-banner-active" : ""}`}
        style={{
          boxShadow: isMyTurn
            ? `0 0 16px ${myColor === "cyan" ? "rgba(100,181,246,0.15)" : "rgba(255,138,128,0.15)"}`
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
            className="px-4 py-3 flex items-center justify-center gap-2"
          >
            <span className="text-lg">🎲</span>
            <span
              className={`text-base font-bold transition-colors duration-300 ${
                isMyTurn
                  ? myColor === "cyan"
                    ? "text-blue-600"
                    : "text-red-500"
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
      <div className="w-full grid grid-cols-2 gap-2">
        <PlayerCard
          name={myDisplayName}
          color={myColor}
          position={myPosition}
          isActive={isMyTurn}
          label="You"
          connected={true}
          lastDice={lastDice}
          isRoller={room.lastMove?.playerId === uid}
          wins={room.winCounts?.[uid] ?? 0}
        />
        <PlayerCard
          name={opponentDisplayName}
          color={opponentColor}
          position={opponentPosition}
          isActive={!isMyTurn}
          label="Opponent"
          connected={
            opponentUid ? (room.players[opponentUid]?.connected ?? true) : true
          }
          lastDice={lastDice}
          isRoller={
            room.lastMove?.playerId !== undefined &&
            room.lastMove.playerId !== uid
          }
          wins={
            opponentUid ? (room.winCounts?.[opponentUid] ?? 0) : 0
          }
        />
      </div>

      {/* Dice + Roll Button */}
      <div className="flex items-center gap-4">
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
            className={`py-3.5 px-8 rounded-xl font-bold text-white text-lg
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
}: {
  name: string;
  color: "cyan" | "amber";
  position: number;
  isActive: boolean;
  label: string;
  connected: boolean;
  lastDice: number | null;
  isRoller: boolean;
  wins: number;
}) {
  return (
    <div
      className={`glass-card px-3 py-2.5 flex items-center gap-2.5 transition-all duration-300 ${
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
                  boxShadow: `0 0 8px ${color === "cyan" ? "#64B5F6" : "#FF8A80"}55`,
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
        <div className="text-sm font-semibold text-stone-800 truncate">{name}</div>
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
