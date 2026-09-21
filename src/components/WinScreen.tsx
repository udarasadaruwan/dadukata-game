import { motion } from "motion/react";
import { Confetti } from "./Confetti";

interface WinScreenProps {
  winnerName: string;
  winnerColor: "cyan" | "amber";
  isMe: boolean;
  onPlayAgain: () => void;
}

const COLOR_CLASSES: Record<string, string> = {
  cyan: "from-blue-400 to-blue-600",
  amber: "from-red-400 to-orange-500",
};

export function WinScreen({
  winnerName,
  winnerColor,
  isMe,
  onPlayAgain,
}: WinScreenProps) {
  return (
    <>
      <Confetti />
      <motion.div
        className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <motion.div
          className="glass-card p-8 mx-4 max-w-sm w-full text-center"
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            type: "spring",
            stiffness: 260,
            damping: 20,
            delay: 0.15,
          }}
        >
          <motion.div
            className="text-6xl mb-4"
            animate={{ rotate: [0, -10, 10, -10, 10, 0] }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            🏆
          </motion.div>

          <h2
            className={`text-3xl font-extrabold mb-2 bg-gradient-to-r ${COLOR_CLASSES[winnerColor]} bg-clip-text text-transparent`}
          >
            {isMe ? "You Win!" : `${winnerName} Wins!`}
          </h2>

          <p className="text-stone-500 text-sm mb-6">
            {isMe
              ? "Congratulations! You conquered the board! 🎉"
              : "Better luck next time! 🐍"}
          </p>

          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={onPlayAgain}
            className="w-full py-3.5 rounded-xl font-bold text-white
              bg-gradient-to-r from-amber-500 to-orange-500
              hover:from-amber-400 hover:to-orange-400
              shadow-lg shadow-amber-400/25 transition-colors
              cursor-pointer"
          >
            🎲 Play Again
          </motion.button>
        </motion.div>
      </motion.div>
    </>
  );
}
