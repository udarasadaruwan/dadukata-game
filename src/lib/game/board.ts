import type { MoveResult, SquarePosition } from "../../types/game";

/** Ladders: bottom square → top square */
export const LADDERS: Record<number, number> = {
  3: 22,
  8: 26,
  20: 41,
  28: 56,
  36: 55,
  43: 77,
  50: 69,
  62: 81,
  71: 92,
};

/** Snakes: head square → tail square */
export const SNAKES: Record<number, number> = {
  17: 7,
  29: 9,
  38: 15,
  47: 25,
  53: 33,
  64: 42,
  75: 32,
  87: 24,
  95: 73,
  99: 78,
};

/**
 * Converts a 1–100 square number to row/col on the board.
 * Row 0 is the bottom row (squares 1–10), row 9 is the top (91–100).
 * Even rows run left→right, odd rows run right→left (boustrophedon).
 */
export function getSquarePosition(square: number): SquarePosition {
  const index = square - 1;
  const row = Math.floor(index / 10);
  const colInRow = index % 10;
  const col = row % 2 === 0 ? colInRow : 9 - colInRow;
  return { row, col };
}

/**
 * Converts a square number to pixel coordinates within a board of `boardSize` px.
 * Returns the center point of the square cell.
 * Y-axis: row 9 (top of board) → y near 0.
 */
export function getSquarePixelPosition(
  square: number,
  boardSize: number,
): { x: number; y: number } {
  const { row, col } = getSquarePosition(square);
  const cell = boardSize / 10;
  return {
    x: col * cell + cell / 2,
    y: (9 - row) * cell + cell / 2,
  };
}

/**
 * Returns the board rows in visual order (top row first).
 * Each row is an array of square numbers in left-to-right display order.
 */
export function getBoardRows(): number[][] {
  const rows: number[][] = [];
  for (let visualRow = 0; visualRow < 10; visualRow++) {
    const boardRow = 9 - visualRow;
    const row: number[] = [];
    for (let col = 0; col < 10; col++) {
      const square =
        boardRow % 2 === 0
          ? boardRow * 10 + col + 1
          : boardRow * 10 + (9 - col) + 1;
      row.push(square);
    }
    rows.push(row);
  }
  return rows;
}

/**
 * Resolves a dice roll from a given position.
 * Handles exact-100 win condition, overshoot, snakes, and ladders.
 */
export function resolveMove(
  currentPosition: number,
  diceRoll: number,
): MoveResult {
  const newPosition = currentPosition + diceRoll;

  if (newPosition > 100) {
    return {
      path: [],
      finalPosition: currentPosition,
      intermediatePosition: currentPosition,
      hitLadder: null,
      hitSnake: null,
      isWin: false,
      noMove: true,
    };
  }

  const path: number[] = [];
  for (let i = currentPosition + 1; i <= newPosition; i++) {
    path.push(i);
  }

  const intermediatePosition = newPosition;

  if (LADDERS[newPosition] !== undefined) {
    return {
      path,
      finalPosition: LADDERS[newPosition],
      intermediatePosition,
      hitLadder: LADDERS[newPosition],
      hitSnake: null,
      isWin: LADDERS[newPosition] === 100,
      noMove: false,
    };
  }

  if (SNAKES[newPosition] !== undefined) {
    return {
      path,
      finalPosition: SNAKES[newPosition],
      intermediatePosition,
      hitLadder: null,
      hitSnake: SNAKES[newPosition],
      isWin: false,
      noMove: false,
    };
  }

  return {
    path,
    finalPosition: newPosition,
    intermediatePosition,
    hitLadder: null,
    hitSnake: null,
    isWin: newPosition === 100,
    noMove: false,
  };
}

/**
 * Generates a 6-character room code using unambiguous characters.
 * Excludes 0/O, 1/I/L to avoid confusion when read aloud.
 */
export function generateRoomCode(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}
