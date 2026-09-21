import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "motion/react";
import { DICE_FACES } from "../lib/game/dice";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { useSound } from "../hooks/useSound";
import type { LastMove } from "../types/game";

interface DiceProps {
  lastMove: LastMove | null;
  isRolling: boolean;
  onRollComplete: () => void;
}

export function Dice({ lastMove, isRolling, onRollComplete }: DiceProps) {
  const [displayValue, setDisplayValue] = useState<number>(1);
  const reducedMotion = useReducedMotion();
  const { play } = useSound();
  const intervalsRef = useRef<ReturnType<typeof setInterval>[]>([]);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const prevIsRolling = useRef(false);

  const handleRollComplete = useCallback(() => {
    onRollComplete();
  }, [onRollComplete]);

  // Clear all timers helper
  const clearAllTimers = useCallback(() => {
    intervalsRef.current.forEach(clearInterval);
    timeoutsRef.current.forEach(clearTimeout);
    intervalsRef.current = [];
    timeoutsRef.current = [];
  }, []);

  const lastMoveRef = useRef(lastMove);
  lastMoveRef.current = lastMove;

  useEffect(() => {
    // If not rolling, reset our guard and clear timers
    if (!isRolling) {
      prevIsRolling.current = false;
      clearAllTimers();
      return;
    }

    // If we are already rolling, don't restart the timers
    // This protects against unrelated re-renders interrupting the dice!
    if (prevIsRolling.current || !lastMoveRef.current) {
      return;
    }

    prevIsRolling.current = true;
    play("diceRoll");

    const diceVal = lastMoveRef.current.diceValue;

    if (reducedMotion) {
      queueMicrotask(() => {
        setDisplayValue(diceVal);
        play("diceLand");
        handleRollComplete();
      });
      return;
    }

    // Phase 1: Fast cycling (0-1.5s) — every 60ms
    const fastInterval = setInterval(() => {
      setDisplayValue(Math.floor(Math.random() * 6) + 1);
    }, 60);
    intervalsRef.current.push(fastInterval);

    // Phase 2: Medium cycling (1.5-2.2s) — every 150ms
    const t1 = setTimeout(() => {
      clearInterval(fastInterval);
      const medInterval = setInterval(() => {
        setDisplayValue(Math.floor(Math.random() * 6) + 1);
      }, 150);
      intervalsRef.current.push(medInterval);

      // Phase 3: Slow cycling (2.2-2.6s) — every 300ms
      const t2 = setTimeout(() => {
        clearInterval(medInterval);
        const slowInterval = setInterval(() => {
          setDisplayValue(Math.floor(Math.random() * 6) + 1);
        }, 300);
        intervalsRef.current.push(slowInterval);

        // Phase 4: Land (2.6s)
        const t3 = setTimeout(() => {
          clearInterval(slowInterval);
          setDisplayValue(diceVal);
          play("diceLand");

          // Phase 5: Pause showing result (300ms) then complete
          const t4 = setTimeout(() => {
            handleRollComplete();
          }, 350);
          timeoutsRef.current.push(t4);
        }, 400);
        timeoutsRef.current.push(t3);
      }, 700);
      timeoutsRef.current.push(t2);
    }, 1500);
    timeoutsRef.current.push(t1);

    // We do NOT clear timers on cleanup here anymore!
    // The timers will naturally finish, or be cleared when isRolling becomes false.
  }, [isRolling, reducedMotion, handleRollComplete, play, clearAllTimers]);

  useEffect(() => {
    if (!isRolling) {
      prevIsRolling.current = false;
    }
  }, [isRolling]);

  const dots = DICE_FACES[displayValue] ?? DICE_FACES[1];

  return (
    <div className={isRolling ? "animate-dice-shake" : ""}>
      <motion.div
        className={`w-16 h-16 sm:w-20 sm:h-20 ${isRolling ? "animate-dice-tumble" : ""}`}
        animate={
          !isRolling && !reducedMotion
            ? { scale: [1.25, 0.93, 1.08, 0.97, 1], rotate: [10, -4, 2, 0] }
            : {}
        }
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full"
          role="img"
          aria-label={`Dice showing ${displayValue}`}
          style={{ filter: "drop-shadow(0 3px 8px rgba(93, 64, 55, 0.25))" }}
        >
          {/* Die body — warm white with rounded corners */}
          <rect x="4" y="4" width="92" height="92" rx="18" fill="url(#dice-bg)" />
          {/* Top highlight */}
          <rect x="8" y="8" width="84" height="40" rx="14" fill="url(#dice-shine)" opacity="0.4" />
          {/* Border */}
          <rect x="4" y="4" width="92" height="92" rx="18" fill="none" stroke="#D7CCC8" strokeWidth="2" />

          <defs>
            <linearGradient id="dice-bg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FFFBF5" />
              <stop offset="100%" stopColor="#F5E6D3" />
            </linearGradient>
            <linearGradient id="dice-shine" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="white" />
              <stop offset="100%" stopColor="white" stopOpacity="0" />
            </linearGradient>
            <radialGradient id="pip-g">
              <stop offset="0%" stopColor="#5D4037" />
              <stop offset="100%" stopColor="#3E2723" />
            </radialGradient>
          </defs>

          {/* Pips */}
          {dots.map((dot, i) => (
            <g key={i}>
              <circle cx={dot.cx + 0.5} cy={dot.cy + 0.5} r="9" fill="rgba(0,0,0,0.08)" />
              <circle cx={dot.cx} cy={dot.cy} r="9" fill="url(#pip-g)" />
              <circle cx={dot.cx - 2} cy={dot.cy - 2} r="2.5" fill="rgba(255,255,255,0.15)" />
            </g>
          ))}
        </svg>
      </motion.div>
    </div>
  );
}
