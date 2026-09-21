/** Returns a cryptographically adequate random integer from 1 to 6. */
export function rollDice(): number {
  return Math.floor(Math.random() * 6) + 1;
}

/**
 * Dot positions for each die face, in a 100×100 SVG viewBox.
 * Used to render the visual dice face.
 */
export const DICE_FACES: Record<number, Array<{ cx: number; cy: number }>> = {
  1: [{ cx: 50, cy: 50 }],
  2: [
    { cx: 32, cy: 32 },
    { cx: 68, cy: 68 },
  ],
  3: [
    { cx: 32, cy: 32 },
    { cx: 50, cy: 50 },
    { cx: 68, cy: 68 },
  ],
  4: [
    { cx: 32, cy: 32 },
    { cx: 68, cy: 32 },
    { cx: 32, cy: 68 },
    { cx: 68, cy: 68 },
  ],
  5: [
    { cx: 32, cy: 32 },
    { cx: 68, cy: 32 },
    { cx: 50, cy: 50 },
    { cx: 32, cy: 68 },
    { cx: 68, cy: 68 },
  ],
  6: [
    { cx: 32, cy: 28 },
    { cx: 68, cy: 28 },
    { cx: 32, cy: 50 },
    { cx: 68, cy: 50 },
    { cx: 32, cy: 72 },
    { cx: 68, cy: 72 },
  ],
};
