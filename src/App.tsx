import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "motion/react";
import { useAuth } from "./hooks/useAuth";
import { useRoom } from "./hooks/useRoom";
import { joinRoom } from "./lib/firebase/rooms";
import { getRoomRoutePath, getUrlRoomCode } from "./lib/app/url";
import { RoomLobby } from "./components/RoomLobby";
import { GameScreen } from "./components/GameScreen";

export default function App() {
  const { uid, loading: authLoading } = useAuth();

  // Initialize roomCode from URL so refresh preserves the room
  const [roomCode, setRoomCode] = useState<string | null>(getUrlRoomCode);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [autoJoinAttempted, setAutoJoinAttempted] = useState(false);
  const { room, loading: roomLoading } = useRoom(roomCode, uid);

  // Auto-rejoin: when we have a roomCode from URL but the user isn't in the room yet,
  // automatically call joinRoom to reconnect them (Firebase joinRoom handles reconnects)
  const autoJoinFired = useRef(false);
  useEffect(() => {
    if (!uid || !roomCode || autoJoinAttempted) return;
    if (autoJoinFired.current) return;

    // Only auto-join if this room code came from the URL (page refresh or shared link)
    const urlCode = getUrlRoomCode();
    if (urlCode !== roomCode) return;

    autoJoinFired.current = true;

    // Attempt to join/rejoin the room — joinRoom handles the case where
    // the user is already a player (reconnection) or is a new player
    joinRoom(roomCode, uid, `Player`)
      .then((result) => {
        if (!result.success) {
          // Room doesn't exist or is full — clear the room code
          setRoomCode(null);
          setJoinError(result.error ?? "Could not rejoin room.");
          setAutoJoinAttempted(true);
          window.history.replaceState({}, "", getRoomRoutePath());
        } else {
          setAutoJoinAttempted(true);
        }
      })
      .catch(() => {
        setRoomCode(null);
        setJoinError("Connection error while rejoining.");
        setAutoJoinAttempted(true);
        window.history.replaceState({}, "", getRoomRoutePath());
      });
  }, [uid, roomCode, autoJoinAttempted]);

  const handleRoomJoined = useCallback((code: string) => {
    setRoomCode(code);
    setJoinError(null);
    setAutoJoinAttempted(true); // don't re-trigger auto-join
    window.history.replaceState({}, "", getRoomRoutePath(code));
  }, []);

  // Loading state
  if (authLoading) {
    return <LoadingSpinner label="Connecting..." color="warm" />;
  }

  // Auth failed
  if (!uid) {
    return (
      <div className="min-h-dvh flex items-center justify-center p-6">
        <div className="glass-card p-8 text-center max-w-sm">
          <div className="text-4xl mb-3">⚠️</div>
          <h2 className="text-xl font-bold text-stone-800 mb-2">
            Connection Failed
          </h2>
          <p className="text-stone-500 text-sm">
            Could not connect to the game server. Please check your internet
            connection and refresh the page.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-6 py-2.5 rounded-lg bg-amber-600 text-white font-medium
              hover:bg-amber-500 transition-colors cursor-pointer"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // No room selected → show create/join screen
  if (!roomCode) {
    return (
      <RoomLobby
        uid={uid}
        initialCode={null}
        joinError={joinError}
        onRoomJoined={handleRoomJoined}
      />
    );
  }

  // Room code set but still loading
  if (roomLoading || !room) {
    return <LoadingSpinner label="Loading room..." color="brown" />;
  }

  // Room exists — render game (handles waiting + playing + finished states)
  return <GameScreen room={room} roomCode={roomCode} uid={uid} />;
}

function LoadingSpinner({
  label,
  color,
}: {
  label: string;
  color: "warm" | "brown";
}) {
  const borderColor =
    color === "warm" ? "border-amber-500" : "border-stone-500";
  return (
    <div className="min-h-dvh flex items-center justify-center">
      <motion.div
        className="flex flex-col items-center gap-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div
          className={`w-10 h-10 border-3 ${borderColor} border-t-transparent rounded-full animate-spin`}
        />
        <span className="text-stone-500 text-sm">{label}</span>
      </motion.div>
    </div>
  );
}
