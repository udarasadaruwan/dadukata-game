import { motion } from "motion/react";

export function DisconnectOverlay() {
  return (
    <motion.div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="glass-card p-8 mx-4 max-w-sm text-center"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <div className="text-4xl mb-4">📡</div>
        <h2 className="text-xl font-bold text-stone-800 mb-2">
          Opponent Disconnected
        </h2>
        <p className="text-stone-500 text-sm leading-relaxed">
          Waiting for your opponent to reconnect...
          <br />
          The game will resume automatically.
        </p>
        <div className="mt-4 flex justify-center gap-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full bg-amber-400"
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
    </motion.div>
  );
}
