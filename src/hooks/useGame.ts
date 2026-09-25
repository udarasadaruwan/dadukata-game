import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import type { RoomState, AnimationPhase } from "../types/game";
import { resolveMove } from "../lib/game/board";
import { rollDice as generateDiceRoll } from "../lib/game/dice";
import {
  performRoll,
  resetRoom as resetRoomFn,
} from "../lib/firebase/rooms";

export interface UseGameReturn {
  isMyTurn: boolean;
  canRoll: boolean;
  animationPhase: AnimationPhase;
  opponentDisconnected: boolean;
  roll: () => Promise<void>;
  playAgain: () => Promise<void>;
  onDiceAnimationComplete: () => void;
  onMoveAnimationComplete: () => void;
  isSubmitting: boolean;
  rollError: string | null;
  showWinScreen: boolean;
}

/**
 * Central game orchestration hook.
 * Manages dice rolls, animation sequencing, and Firebase state writes.
 */
export function useGame(
  room: RoomState | null,
  roomCode: string,
  uid: string,
): UseGameReturn {
  const [animationPhase, setAnimationPhase] = useState<AnimationPhase>("idle");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rollError, setRollError] = useState<string | null>(null);
  const [processedTimestamp, setProcessedTimestamp] = useState(0);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const playerUids = useMemo(
    () => (room ? Object.keys(room.players) : []),
    [room],
  );

  const otherPlayerUids = useMemo(
    () => playerUids.filter((id) => id !== uid),
    [playerUids, uid],
  );

  const isMyTurn = room?.turn === uid;
  const canRoll =
    isMyTurn &&
    animationPhase === "idle" &&
    room?.status === "playing" &&
    playerUids.length >= 2 &&
    !isSubmitting;

  const opponentDisconnected = otherPlayerUids.some(
    (playerUid) => !(room?.players[playerUid]?.connected ?? true),
  );

  // Detect new dice rolls and trigger animation sequence
  useEffect(() => {
    if (!room?.lastMove) return;
    if (room.lastMove.timestamp <= processedTimestamp) return;

    const timestamp = room.lastMove.timestamp;
    queueMicrotask(() => {
      setProcessedTimestamp(timestamp);
      setAnimationPhase("rolling");
      setIsSubmitting(false); // Clear submitting state if it was a roll we initiated
      setRollError(null);
    });
  }, [room?.lastMove, processedTimestamp]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    const timeouts = timeoutsRef.current;
    return () => {
      timeouts.forEach(clearTimeout);
    };
  }, []);

  const onDiceAnimationComplete = useCallback(() => {
    setAnimationPhase("moving");
  }, []);

  const onMoveAnimationComplete = useCallback(() => {
    if (room?.lastMove?.bonusRoll && room.status === "playing") {
      setAnimationPhase("done");
      const timeout = setTimeout(() => {
        setAnimationPhase("idle");
      }, 900);
      timeoutsRef.current.push(timeout);
      return;
    }

    setAnimationPhase("idle");
  }, [room]);

  const roll = useCallback(async () => {
    if (!room || !canRoll || playerUids.length < 2) return;

    setIsSubmitting(true);
    setRollError(null);

    const currentPos = room.positions[uid] ?? 0;
    const diceValue = generateDiceRoll();
    const moveResult = resolveMove(currentPos, diceValue);
    const bonusRoll = (diceValue === 1 || diceValue === 6) && !moveResult.isWin;
    const currentTurnIndex = Math.max(0, playerUids.indexOf(uid));
    const nextPlayerIndex = (currentTurnIndex + 1) % playerUids.length;
    const nextPlayerUid = playerUids[nextPlayerIndex] ?? uid;
    const previousMove = room.lastMove;
    const bonusStreak =
      bonusRoll && previousMove?.playerId === uid && previousMove.bonusRoll
        ? (previousMove.bonusStreak ?? 1) + 1
        : bonusRoll
          ? 1
          : 0;
    const ladderStreak =
      moveResult.hitLadder !== null &&
      previousMove?.playerId === uid &&
      previousMove.hitLadder !== null
        ? (previousMove.ladderStreak ?? 1) + 1
        : moveResult.hitLadder !== null
          ? 1
          : 0;

    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    try {
      const rollPromise = performRoll(
        roomCode,
        uid,
        moveResult,
        diceValue,
        currentPos,
        bonusRoll ? uid : nextPlayerUid,
        moveResult.isWin,
        bonusRoll,
        bonusStreak,
        ladderStreak,
        room.winCounts?.[uid] ?? 0,
      );

      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error("Roll timed out after 6 seconds")), 6000);
      });

      await Promise.race([rollPromise, timeoutPromise]);
      // Success! The onValue listener will pick up the update and clear isSubmitting.
    } catch (err) {
      console.error("[useGame] Roll failed or timed out:", err);
      setIsSubmitting(false);
      setRollError("Something went wrong — try again.");
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }, [room, canRoll, playerUids, roomCode, uid]);

  const playAgain = useCallback(async () => {
    if (!room) return;
    setAnimationPhase("idle");
    setProcessedTimestamp(0);
    await resetRoomFn(roomCode, room);
  }, [room, roomCode]);

  const hasUnprocessedMove = room?.lastMove ? room.lastMove.timestamp > processedTimestamp : false;
  const showWinScreen = room?.status === "finished" && !!room?.winner && animationPhase === "idle" && !hasUnprocessedMove;

  return {
    isMyTurn,
    canRoll,
    animationPhase,
    opponentDisconnected,
    roll,
    playAgain,
    onDiceAnimationComplete,
    onMoveAnimationComplete,
    isSubmitting,
    rollError,
    showWinScreen,
  };
}
