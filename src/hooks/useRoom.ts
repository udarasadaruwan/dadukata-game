import { useState, useEffect, useRef } from "react";
import type { RoomState } from "../types/game";
import { subscribeToRoom, setupPresence } from "../lib/firebase/rooms";

/**
 * Subscribes to a room's real-time state and manages presence tracking.
 * Re-subscribes whenever roomCode or uid changes.
 */
export function useRoom(
  roomCode: string | null,
  uid: string | null,
): { room: RoomState | null; loading: boolean } {
  const [room, setRoom] = useState<RoomState | null>(null);
  const [loading, setLoading] = useState(true);
  const hasSubscribed = useRef(false);

  useEffect(() => {
    if (!roomCode || !uid) {
      // Reset if no room/uid — use a microtask to avoid synchronous setState in effect
      if (hasSubscribed.current) {
        hasSubscribed.current = false;
        queueMicrotask(() => setLoading(false));
      }
      return;
    }

    hasSubscribed.current = true;
    void setupPresence(roomCode, uid).catch((err) => {
      console.warn("[useRoom] Presence setup skipped:", err);
    });

    const unsubscribe = subscribeToRoom(roomCode, (data) => {
      setRoom(data);
      setLoading(false);
    });

    return () => {
      unsubscribe();
      hasSubscribed.current = false;
    };
  }, [roomCode, uid]);

  return { room, loading };
}
