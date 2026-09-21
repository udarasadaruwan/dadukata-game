import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { RoomState } from "../types/game";
import type { PlayerColor } from "../types/game";
import { useGame } from "../hooks/useGame";
import { useSound } from "../hooks/useSound";
import { Board } from "./Board";
import { GameControls } from "./GameControls";
import { WinScreen } from "./WinScreen";
import { DisconnectOverlay } from "./DisconnectOverlay";
import { MuteButton } from "./MuteButton";
import { EmojiBar } from "./EmojiBar";

interface GameScreenProps {
  room: RoomState;
  roomCode: string;
  uid: string;
}

function WaitingLobby({ roomCode }: { roomCode: string }) {
  const [copied, setCopied] = useState(false);

  const shareLink = `${window.location.origin}/?room=${roomCode}`;

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select text
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="min-h-dvh flex items-center justify-center p-6">
      <MuteButton />
      <motion.div
        className="glass-card p-8 text-center max-w-md w-full"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-amber-500 via-orange-500 to-red-400 bg-clip-text text-transparent mb-2">
          Dathukata
        </h1>
        <p className="text-stone-500 text-sm mb-6">Room created! Share the code below with your friend.</p>

        {/* Room Code Display */}
        <div className="mb-4">
          <p className="text-xs text-stone-400 uppercase tracking-widest mb-2 font-semibold">Room Code</p>
          <button
            onClick={handleCopyCode}
            className="group relative inline-flex items-center gap-3 px-6 py-4 rounded-xl
              bg-amber-50 border-2 border-amber-200 hover:border-amber-400
              transition-all duration-200 cursor-pointer"
          >
            <span className="text-3xl font-mono font-bold tracking-[0.3em] text-stone-800">
              {roomCode}
            </span>
            <span className="text-stone-400 group-hover:text-amber-600 transition-colors">
              {copied ? (
                <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
            </span>
          </button>
          <p className="text-xs text-stone-400 mt-2">
            {copied ? "✅ Copied!" : "Click to copy"}
          </p>
        </div>

        {/* Share Link Button */}
        <button
          onClick={handleCopyLink}
          className="w-full px-4 py-2.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500
            text-white text-sm font-bold
            hover:from-amber-400 hover:to-orange-400 transition-colors cursor-pointer mb-6"
        >
          📋 Copy Share Link
        </button>

        {/* Waiting indicator */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse [animation-delay:0.3s]" />
            <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse [animation-delay:0.6s]" />
          </div>
          <p className="text-stone-500 text-sm">Waiting for opponent to join...</p>
        </div>
      </motion.div>
    </div>
  );
}

export function GameScreen({ room, roomCode, uid }: GameScreenProps) {
  const game = useGame(room, roomCode, uid);
  const { play } = useSound();
  const prevPhaseRef = useRef(game.animationPhase);
  const prevShowWinRef = useRef(false);

  // Sound triggers based on animation phase transitions
  useEffect(() => {
    const prev = prevPhaseRef.current;
    const curr = game.animationPhase;
    prevPhaseRef.current = curr;

    if (prev === "rolling" && curr === "moving" && room.lastMove) {
      // Moving phase started — check for ladder/snake sounds
      if (room.lastMove.hitLadder !== null) {
        // Delay ladder sound to sync with the ladder animation (after step-by-step)
        const steps = room.lastMove.to - room.lastMove.from;
        const delay = Math.max(0, steps * 90); // ~90ms per step
        setTimeout(() => play("ladderClimb"), delay);
      } else if (room.lastMove.hitSnake !== null) {
        const steps = room.lastMove.intermediate - room.lastMove.from;
        const delay = Math.max(0, steps * 90);
        setTimeout(() => play("snakeSlide"), delay);
      }
    }
  }, [game.animationPhase, room.lastMove, play]);

  // Win sound
  useEffect(() => {
    if (!prevShowWinRef.current && game.showWinScreen) {
      play("winJingle");
    }
    prevShowWinRef.current = game.showWinScreen;
  }, [game.showWinScreen, play]);

  // Show waiting lobby when room status is "waiting"
  if (room.status === "waiting") {
    return <WaitingLobby roomCode={roomCode} />;
  }

  const playerColors: Record<string, PlayerColor> = {};
  for (const [id, player] of Object.entries(room.players)) {
    playerColors[id] = player.color;
  }

  const playerUids = Object.keys(room.players);

  const winnerName = room.winner
    ? (room.players[room.winner]?.displayName ?? "Unknown")
    : "";
  const winnerColor = room.winner
    ? (room.players[room.winner]?.color ?? "cyan")
    : "cyan";

  return (
    <div className="min-h-dvh flex flex-col items-center py-4 px-3 sm:px-4">
      <MuteButton />

      {/* Header */}
      <header className="text-center mb-3">
        <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-amber-500 via-orange-500 to-red-400 bg-clip-text text-transparent">
          Dathukata
        </h1>
      </header>

      {/* Board */}
      <Board
        positions={room.positions}
        playerColors={playerColors}
        playerUids={playerUids}
        lastMove={room.lastMove}
        animationPhase={game.animationPhase}
        onMoveComplete={game.onMoveAnimationComplete}
        currentTurnUid={room.turn}
      />

      {/* Controls */}
      <div className="mt-3 w-full">
        <GameControls
          room={room}
          uid={uid}
          isMyTurn={game.isMyTurn}
          canRoll={game.canRoll}
          animationPhase={game.animationPhase}
          myColor={game.myColor}
          opponentColor={game.opponentColor}
          myDisplayName={game.myDisplayName}
          opponentDisplayName={game.opponentDisplayName}
          myPosition={game.myPosition}
          opponentPosition={game.opponentPosition}
          onRoll={game.roll}
          onDiceAnimationComplete={game.onDiceAnimationComplete}
          isSubmitting={game.isSubmitting}
          rollError={game.rollError}
        />
      </div>

      {/* Emoji Reactions */}
      <EmojiBar roomCode={roomCode} uid={uid} />

      {/* Footer */}
      <footer className="mt-auto w-full text-center pt-3 pb-1">
        <p className="text-[11px] text-stone-400/70 font-medium tracking-wide">
          Developed by @udara sandaruwan
        </p>
      </footer>

      {/* Win overlay */}
      <AnimatePresence>
        {game.showWinScreen && (
          <WinScreen
            winnerName={winnerName}
            winnerColor={winnerColor}
            isMe={room.winner === uid}
            onPlayAgain={game.playAgain}
          />
        )}
      </AnimatePresence>

      {/* Disconnect overlay */}
      <AnimatePresence>
        {game.opponentDisconnected && room.status === "playing" && (
          <DisconnectOverlay />
        )}
      </AnimatePresence>
    </div>
  );
}
