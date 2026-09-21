import { motion } from "motion/react";
import { useSound } from "../hooks/useSound";

export function MuteButton() {
  const { muted, toggleMute } = useSound();

  return (
    <motion.button
      onClick={toggleMute}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      className="fixed top-3 right-3 z-50 w-10 h-10 rounded-full
        bg-white/80 backdrop-blur-md border-2 border-stone-200
        flex items-center justify-center
        text-stone-500 hover:text-stone-800 transition-colors cursor-pointer
        shadow-md shadow-stone-200/40"
      aria-label={muted ? "Unmute sounds" : "Mute sounds"}
      title={muted ? "Unmute" : "Mute"}
    >
      {muted ? (
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.8}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
          />
        </svg>
      ) : (
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.8}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728"
          />
        </svg>
      )}
    </motion.button>
  );
}
