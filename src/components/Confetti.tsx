import { useState } from "react";

interface ConfettiProps {
  count?: number;
}

const COLORS = [
  "#06b6d4",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#10b981",
  "#f43f5e",
  "#3b82f6",
  "#fbbf24",
];

interface Particle {
  id: number;
  x: number;
  delay: number;
  duration: number;
  color: string;
  size: number;
  rotation: number;
}

function createParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 0.6,
    duration: 1.8 + Math.random() * 1.2,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    size: 5 + Math.random() * 7,
    rotation: Math.random() * 360,
  }));
}

export function Confetti({ count = 80 }: ConfettiProps) {
  // useState with initializer function — runs once, is pure from React's perspective
  const [particles] = useState<Particle[]>(() => createParticles(count));

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute animate-confetti-fall"
          style={
            {
              left: `${p.x}%`,
              top: -20,
              width: p.size,
              height: p.size * 0.6,
              backgroundColor: p.color,
              borderRadius: 2,
              "--delay": `${p.delay}s`,
              "--duration": `${p.duration}s`,
              transform: `rotate(${p.rotation}deg)`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
