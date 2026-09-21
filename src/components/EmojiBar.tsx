import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { sendReaction, subscribeToReactions } from "../lib/firebase/rooms";

interface EmojiBarProps {
  roomCode: string;
  uid: string;
}

const EMOJIS = ["👏", "😂", "😤", "🎉", "🐍", "🪜"];

interface FloatingEmoji {
  id: number;
  emoji: string;
  x: number;
}

export function EmojiBar({ roomCode, uid }: EmojiBarProps) {
  const [floatingEmojis, setFloatingEmojis] = useState<FloatingEmoji[]>([]);
  const [cooldown, setCooldown] = useState(false);
  const idCounter = useRef(0);
  const lastProcessed = useRef(0);

  // Subscribe to reactions from the other player
  useEffect(() => {
    const unsubscribe = subscribeToReactions(roomCode, (reaction) => {
      if (!reaction) return;
      // Only show floating emoji for reactions we haven't seen
      if (reaction.timestamp <= lastProcessed.current) return;
      lastProcessed.current = reaction.timestamp;

      // Show floating emoji
      const id = ++idCounter.current;
      const x = 30 + Math.random() * 40; // Random horizontal position
      setFloatingEmojis((prev) => [...prev, { id, emoji: reaction.emoji, x }]);

      // Remove after animation
      setTimeout(() => {
        setFloatingEmojis((prev) => prev.filter((e) => e.id !== id));
      }, 1600);
    });

    return () => unsubscribe();
  }, [roomCode, uid]);

  const handleSend = useCallback(
    async (emoji: string) => {
      if (cooldown) return;

      setCooldown(true);
      setTimeout(() => setCooldown(false), 800);

      try {
        await sendReaction(roomCode, uid, emoji);
      } catch {
        // Silent fail
      }
    },
    [roomCode, uid, cooldown],
  );

  return (
    <>
      {/* Floating emojis overlay */}
      <div className="fixed inset-0 pointer-events-none z-30 overflow-hidden">
        <AnimatePresence>
          {floatingEmojis.map((fe) => (
            <motion.div
              key={fe.id}
              className="absolute text-4xl"
              style={{ left: `${fe.x}%`, bottom: "20%" }}
              initial={{ opacity: 0, y: 20, scale: 0.5 }}
              animate={{ opacity: 1, y: -100, scale: 1.2 }}
              exit={{ opacity: 0, y: -160, scale: 0.8 }}
              transition={{ duration: 1.4, ease: "easeOut" }}
            >
              {fe.emoji}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Emoji picker bar */}
      <div className="mt-3 w-full max-w-[500px] mx-auto">
        <div className="glass-card px-2 py-1.5 flex items-center justify-center gap-1">
          {EMOJIS.map((emoji) => (
            <motion.button
              key={emoji}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.85 }}
              onClick={() => handleSend(emoji)}
              disabled={cooldown}
              className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl
                transition-all cursor-pointer
                hover:bg-amber-50 active:bg-amber-100
                ${cooldown ? "opacity-40 cursor-not-allowed" : ""}`}
              aria-label={`Send ${emoji} reaction`}
            >
              {emoji}
            </motion.button>
          ))}
        </div>
      </div>
    </>
  );
}
