import { useState, useCallback } from "react";
import { motion } from "motion/react";
import { useAuth } from "./hooks/useAuth";
import { useRoom } from "./hooks/useRoom";
import { getRoomRoutePath, getUrlRoomCode } from "./lib/app/url";
import { RoomLobby } from "./components/RoomLobby";
import { GameScreen } from "./components/GameScreen";

export default function App() {
  const { uid, loading: authLoading } = useAuth();
  const [initialJoinCode, setInitialJoinCode] = useState<string | null>(
    getUrlRoomCode,
  );
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const { room, loading: roomLoading } = useRoom(roomCode, uid);

  const handleRoomJoined = useCallback((code: string) => {
    setRoomCode(code);
    setInitialJoinCode(null);
    setJoinError(null);
    window.history.replaceState({}, "", getRoomRoutePath(code));
  }, []);

  if (authLoading) {
    return <LoadingSpinner label="Connecting..." color="warm" />;
  }

  if (!uid) {
    return (
      <div className="min-h-dvh flex items-center justify-center p-6">
        <div className="glass-card p-8 text-center max-w-sm">
          <div className="text-4xl mb-3">Warning</div>
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

  if (!roomCode) {
    return (
      <RoomLobby
        uid={uid}
        initialCode={initialJoinCode}
        joinError={joinError}
        onRoomJoined={handleRoomJoined}
      />
    );
  }

  if (roomLoading || !room) {
    return <LoadingSpinner label="Loading room..." color="brown" />;
  }

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
