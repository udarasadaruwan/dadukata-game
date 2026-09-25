import { useState } from "react";
import { motion } from "motion/react";
import { createRoom, joinRoom } from "../lib/firebase/rooms";
import { getRoomInviteLink } from "../lib/app/url";

interface RoomLobbyProps {
  uid: string;
  initialCode: string | null;
  joinError?: string | null;
  onRoomJoined: (code: string) => void;
}

export function RoomLobby({
  uid,
  initialCode,
  joinError,
  onRoomJoined,
}: RoomLobbyProps) {
  const [name, setName] = useState("");
  const [joinCode, setJoinCode] = useState(initialCode ?? "");
  const [mode, setMode] = useState<"initial" | "create" | "join">(
    initialCode ? "join" : "initial",
  );
  const [error, setError] = useState<string | null>(joinError ?? null);
  const [loading, setLoading] = useState(false);
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    try {
      const code = await createRoom(uid, trimmed);
      setCreatedCode(code);
      onRoomJoined(code);
    } catch {
      setError("Failed to create room. Please try again.");
    }
    setLoading(false);
  };

  const handleJoin = async () => {
    const trimmed = name.trim();
    const code = joinCode.trim().toUpperCase();
    if (!trimmed || !code) return;
    setLoading(true);
    setError(null);
    try {
      const result = await joinRoom(code, uid, trimmed);
      if (result.success) {
        onRoomJoined(code);
      } else {
        setError(result.error ?? "Failed to join room.");
      }
    } catch {
      setError("Connection error. Please try again.");
    }
    setLoading(false);
  };

  const handleCopyLink = async (code: string) => {
    const link = getRoomInviteLink(code);
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard API might not be available */
    }
  };

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-6">
      <motion.div
        className="glass-card p-8 w-full max-w-sm"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-amber-500 via-orange-500 to-red-400 bg-clip-text text-transparent">
            Dathukata
          </h1>
          <p className="text-stone-500 text-sm mt-1">
            Snakes & Ladders · 2 Players
          </p>
        </div>

        {/* Name input (always visible unless we've created a room) */}
        {!createdCode && (
          <div className="mb-5">
            <label
              htmlFor="player-name"
              className="block text-xs font-semibold text-stone-500 mb-1.5 uppercase tracking-wide"
            >
              Your Name
            </label>
            <input
              id="player-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              maxLength={20}
              className="input-warm text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  if (mode === "join") handleJoin();
                  else if (mode === "create") handleCreate();
                }
              }}
            />
          </div>
        )}

        {/* Mode buttons */}
        {mode === "initial" && (
          <div className="flex flex-col gap-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setMode("create")}
              className="w-full py-3.5 rounded-xl font-bold text-white
                bg-gradient-to-r from-amber-500 to-orange-500
                hover:from-amber-400 hover:to-orange-400
                shadow-lg shadow-amber-500/25 transition-colors
                cursor-pointer min-h-[48px]"
            >
              🎲 Create Room
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setMode("join")}
              className="w-full py-3.5 rounded-xl font-bold text-stone-700
                bg-white/60 border-2 border-stone-200
                hover:bg-white/80 hover:border-stone-300 transition-colors
                cursor-pointer min-h-[48px]"
            >
              🤝 Join Room
            </motion.button>
          </div>
        )}

        {/* Create mode — before room created */}
        {mode === "create" && !createdCode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col gap-3"
          >
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleCreate}
              disabled={!name.trim() || loading}
              className="w-full py-3.5 rounded-xl font-bold text-white
                bg-gradient-to-r from-amber-500 to-orange-500
                hover:from-amber-400 hover:to-orange-400
                shadow-lg shadow-amber-500/25 transition-colors
                disabled:opacity-50 disabled:cursor-not-allowed
                cursor-pointer min-h-[48px]"
            >
              {loading ? "Creating..." : "🎲 Create Room"}
            </motion.button>
            <button
              onClick={() => setMode("initial")}
              className="text-sm text-stone-400 hover:text-stone-700 transition-colors cursor-pointer"
            >
              ← Back
            </button>
          </motion.div>
        )}

        {/* Created — show room code + waiting */}
        {mode === "create" && createdCode && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <p className="text-sm text-stone-500 mb-3">
              Share this code with your friend
            </p>
            <div className="bg-amber-50 rounded-lg py-4 px-6 mb-4 border-2 border-amber-200">
              <span className="text-3xl font-extrabold tracking-[0.25em] text-stone-800 font-mono">
                {createdCode}
              </span>
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleCopyLink(createdCode)}
              className="w-full py-3 rounded-xl font-bold text-white
                bg-gradient-to-r from-emerald-500 to-teal-500
                hover:from-emerald-400 hover:to-teal-400
                shadow-lg shadow-emerald-500/25 transition-colors
                cursor-pointer min-h-[48px]"
            >
              {copied ? (
                <motion.span
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                >
                  ✓ Link Copied!
                </motion.span>
              ) : (
                "📋 Copy Invite Link"
              )}
            </motion.button>
            <p className="text-xs text-stone-400 mt-4">
              Waiting for opponent to join...
            </p>
            <div className="mt-2 flex justify-center gap-1">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-amber-400"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{
                    duration: 1.2,
                    repeat: Infinity,
                    delay: i * 0.2,
                  }}
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* Join mode */}
        {mode === "join" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col gap-3"
          >
            <div>
              <label
                htmlFor="room-code"
                className="block text-xs font-semibold text-stone-500 mb-1.5 uppercase tracking-wide"
              >
                Room Code
              </label>
              <input
                id="room-code"
                type="text"
                value={joinCode}
                onChange={(e) =>
                  setJoinCode(e.target.value.toUpperCase().slice(0, 6))
                }
                placeholder="e.g. X7K2QP"
                maxLength={6}
                className="input-warm text-center text-xl font-bold
                  tracking-[0.2em] font-mono uppercase"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleJoin();
                }}
              />
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleJoin}
              disabled={!name.trim() || !joinCode.trim() || loading}
              className="w-full py-3.5 rounded-xl font-bold text-white
                bg-gradient-to-r from-emerald-500 to-teal-500
                hover:from-emerald-400 hover:to-teal-400
                shadow-lg shadow-emerald-500/25 transition-colors
                disabled:opacity-50 disabled:cursor-not-allowed
                cursor-pointer min-h-[48px]"
            >
              {loading ? "Joining..." : "🤝 Join Room"}
            </motion.button>
            <button
              onClick={() => {
                setMode("initial");
                setError(null);
              }}
              className="text-sm text-stone-400 hover:text-stone-700 transition-colors cursor-pointer"
            >
              ← Back
            </button>
          </motion.div>
        )}

        {/* Error */}
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-red-500 text-sm text-center mt-4 font-medium"
          >
            {error}
          </motion.p>
        )}
      </motion.div>

      {/* Footer */}
      <div className="mt-auto pt-8 pb-3 text-center flex flex-col gap-2 w-full">
        <p className="text-stone-400 text-xs">
          No signup needed · Just share the code
        </p>
        <p className="text-[11px] text-stone-400/70 font-medium tracking-wide">
          Developed by @udara sandaruwan
        </p>
      </div>
    </div>
  );
}
