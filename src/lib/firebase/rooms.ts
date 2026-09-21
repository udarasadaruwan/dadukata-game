import {
  ref,
  set,
  get,
  update,
  onValue,
  onDisconnect,
  type Unsubscribe,
} from "firebase/database";
import { db } from "./config";
import type { RoomState, PlayerColor, DiceState, LastMove } from "../../types/game";
import type { MoveResult } from "../../types/game";
import { generateRoomCode } from "../game/board";

function roomRef(code: string) {
  return ref(db, `rooms/${code}`);
}

/**
 * Creates a new room with a unique 6-char code.
 * The creating player becomes Player 1 (cyan) and gets first turn.
 */
export async function createRoom(
  uid: string,
  displayName: string,
): Promise<string> {
  let code = generateRoomCode();
  let existing = await get(roomRef(code));
  let attempts = 0;

  while (existing.exists() && attempts < 10) {
    code = generateRoomCode();
    existing = await get(roomRef(code));
    attempts++;
  }

  const roomData: RoomState = {
    status: "waiting",
    createdAt: Date.now(),
    turn: uid,
    winner: null,
    dice: null,
    players: {
      [uid]: {
        color: "cyan" as PlayerColor,
        connected: true,
        joinedAt: Date.now(),
        displayName,
      },
    },
    positions: {
      [uid]: 0,
    },
    lastMove: null,
  };

  try {
    await set(roomRef(code), roomData);
    console.log(`[Dathukata:FB] createRoom: code=${code}, uid=${uid}`);
  } catch (err) {
    console.error(`[Dathukata:FB] createRoom FAILED:`, err);
    throw err;
  }
  return code;
}

/**
 * Joins an existing room as Player 2 (amber).
 * Validates: room exists, not full, not expired (>1 hour old & finished).
 */
export async function joinRoom(
  code: string,
  uid: string,
  displayName: string,
): Promise<{ success: boolean; error?: string }> {
  let snapshot;
  try {
    snapshot = await get(roomRef(code));
  } catch (err) {
    console.error(`[Dathukata:FB] joinRoom read FAILED:`, err);
    return { success: false, error: "Connection error." };
  }

  if (!snapshot.exists()) {
    return {
      success: false,
      error: "Room not found. Check the code and try again.",
    };
  }

  const room = snapshot.val() as RoomState;

  // Reject stale rooms (>1 hour old and finished)
  const oneHour = 60 * 60 * 1000;
  if (room.status === "finished" && Date.now() - room.createdAt > oneHour) {
    return { success: false, error: "This room has expired." };
  }

  const playerUids = Object.keys(room.players ?? {});

  // Already in the room → reconnecting
  if (playerUids.includes(uid)) {
    try {
      await set(ref(db, `rooms/${code}/players/${uid}/connected`), true);
      console.log(`[Dathukata:FB] joinRoom: reconnected uid=${uid} to room=${code}`);
    } catch (err) {
      console.error(`[Dathukata:FB] joinRoom reconnect FAILED:`, err);
      return { success: false, error: "Failed to reconnect." };
    }
    return { success: true };
  }

  if (playerUids.length >= 2) {
    return {
      success: false,
      error: "Room is full. Only 2 players can join.",
    };
  }

  // Add Player 2 and start the game
  const updates: Record<string, unknown> = {
    [`players/${uid}`]: {
      color: "amber" as PlayerColor,
      connected: true,
      joinedAt: Date.now(),
      displayName,
    },
    [`positions/${uid}`]: 0,
    status: "playing",
  };

  try {
    await update(roomRef(code), updates);
    console.log(`[Dathukata:FB] joinRoom: uid=${uid} joined room=${code}`);
  } catch (err) {
    console.error(`[Dathukata:FB] joinRoom write FAILED:`, err);
    return { success: false, error: "Failed to join room." };
  }
  return { success: true };
}

/** Subscribes to real-time room state changes. */
export function subscribeToRoom(
  code: string,
  callback: (room: RoomState | null) => void,
): Unsubscribe {
  return onValue(roomRef(code), (snapshot) => {
    callback(snapshot.exists() ? (snapshot.val() as RoomState) : null);
  });
}

/**
 * Performs a complete dice roll + move as a single atomic update.
 * Writes dice, position, lastMove, turn, and win state simultaneously.
 */
export async function performRoll(
  code: string,
  uid: string,
  moveResult: MoveResult,
  diceValue: number,
  previousPosition: number,
  nextTurnUid: string,
  isWin: boolean,
): Promise<void> {
  const now = Date.now();

  const dice: DiceState = {
    value: diceValue,
    rolledBy: uid,
    rolledAt: now,
  };

  const lastMove: LastMove = {
    playerId: uid,
    from: previousPosition,
    to: moveResult.finalPosition,
    intermediate: moveResult.intermediatePosition,
    diceValue,
    hitLadder: moveResult.hitLadder,
    hitSnake: moveResult.hitSnake,
    noMove: moveResult.noMove,
    timestamp: now,
  };

  const updates: Record<string, unknown> = {
    dice,
    [`positions/${uid}`]: moveResult.finalPosition,
    lastMove,
    turn: isWin ? uid : nextTurnUid,
  };

  if (isWin) {
    updates.status = "finished";
    updates.winner = uid;
  }

  console.log(`[Dathukata:FB] performRoll: uid=${uid}, dice=${diceValue}, ${previousPosition}→${moveResult.finalPosition}, win=${isWin}`);

  try {
    await update(roomRef(code), updates);
    console.log(`[Dathukata:FB] performRoll: write OK`);
  } catch (err) {
    console.error(`[Dathukata:FB] performRoll FAILED:`, err);
    throw err;
  }
}

/**
 * Sets up presence tracking: marks the player as connected,
 * and auto-marks them disconnected if their browser closes.
 */
export async function setupPresence(
  code: string,
  uid: string,
): Promise<void> {
  const connectedRef = ref(db, `rooms/${code}/players/${uid}/connected`);
  await set(connectedRef, true);
  await onDisconnect(connectedRef).set(false);
}

/** Resets a finished room for a rematch. Keeps players, resets game state. */
export async function resetRoom(code: string, room: RoomState): Promise<void> {
  const playerUids = Object.keys(room.players);
  const positions: Record<string, number> = {};
  for (const uid of playerUids) {
    positions[uid] = 0;
  }

  const updates: Record<string, unknown> = {
    status: "playing",
    winner: null,
    dice: null,
    lastMove: null,
    turn: playerUids[0],
    positions,
  };

  try {
    await update(roomRef(code), updates);
    console.log(`[Dathukata:FB] resetRoom: room=${code} reset for rematch`);
  } catch (err) {
    console.error(`[Dathukata:FB] resetRoom FAILED:`, err);
    throw err;
  }
}

/** Sends an emoji reaction to the room. */
export async function sendReaction(
  code: string,
  uid: string,
  emoji: string,
): Promise<void> {
  const reactionRef = ref(db, `rooms/${code}/reaction`);
  await set(reactionRef, {
    emoji,
    playerId: uid,
    timestamp: Date.now(),
  });
}

/** Subscribes to emoji reactions in a room. */
export function subscribeToReactions(
  code: string,
  callback: (reaction: { emoji: string; playerId: string; timestamp: number } | null) => void,
): Unsubscribe {
  const reactionRef = ref(db, `rooms/${code}/reaction`);
  return onValue(reactionRef, (snapshot) => {
    callback(snapshot.exists() ? snapshot.val() : null);
  });
}
