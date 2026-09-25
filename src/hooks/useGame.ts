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
  myColor: "cyan" | "amber";
  opponentColor: "cyan" | "amber";
  myPosition: number;
  opponentPosition: number;
  myDisplayName: string;
  opponentDisplayName: string;
  opponentUid: string | null;
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

  const opponentUid = useMemo(
    () => playerUids.find((id) => id !== uid) ?? null,
    [playerUids, uid],
  );

  const isMyTurn = room?.turn === uid;
  const canRoll =
    isMyTurn && animationPhase === "idle" && room?.status === "playing" && !isSubmitting;

  const myColor = room?.players[uid]?.color ?? "cyan";
  const opponentColor = opponentUid
    ? (room?.players[opponentUid]?.color ?? "amber")
    : "amber";

  const myPosition = room?.positions[uid] ?? 0;
  const opponentPosition = opponentUid
    ? (room?.positions[opponentUid] ?? 0)
    : 0;

  const myDisplayName = room?.players[uid]?.displayName ?? "Player 1";
  const opponentDisplayName = opponentUid
    ? (room?.players[opponentUid]?.displayName ?? "Player 2")
    : "Waiting...";

  const opponentDisconnected = opponentUid
    ? !(room?.players[opponentUid]?.connected ?? true)
    : false;

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
    if (!room || !canRoll || !opponentUid) return;

    setIsSubmitting(true);
    setRollError(null);

    const currentPos = room.positions[uid] ?? 0;
    const diceValue = generateDiceRoll();
    const moveResult = resolveMove(currentPos, diceValue);
    const bonusRoll = (diceValue === 1 || diceValue === 6) && !moveResult.isWin;
    const nextTurnUid = bonusRoll ? uid : opponentUid;
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
        nextTurnUid,
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
  }, [room, canRoll, opponentUid, roomCode, uid]);

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
    myColor,
    opponentColor,
    myPosition,
    opponentPosition,
    myDisplayName,
    opponentDisplayName,
    opponentUid,
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
