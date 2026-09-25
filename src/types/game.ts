export type GameStatus = "waiting" | "playing" | "finished";

export type PlayerColor = "cyan" | "amber" | "emerald" | "violet";

export interface PlayerState {
  color: PlayerColor;
  connected: boolean;
  joinedAt: number;
  displayName: string;
}

export interface DiceState {
  value: number;
  rolledBy: string;
  rolledAt: number;
}

export interface LastMove {
  playerId: string;
  from: number;
  to: number;
  intermediate: number;
  diceValue: number;
  hitLadder: number | null;
  hitSnake: number | null;
  noMove: boolean;
  bonusRoll?: boolean;
  bonusStreak?: number;
  ladderStreak?: number;
  timestamp: number;
}

export interface RoomState {
  status: GameStatus;
  createdAt: number;
  turn: string;
  winner: string | null;
  dice: DiceState | null;
  players: Record<string, PlayerState>;
  positions: Record<string, number>;
  winCounts?: Record<string, number>;
  lastMove: LastMove | null;
}

export interface SquarePosition {
  row: number;
  col: number;
}

export interface MoveResult {
  path: number[];
  finalPosition: number;
  intermediatePosition: number;
  hitLadder: number | null;
  hitSnake: number | null;
  isWin: boolean;
  noMove: boolean;
}

export type AnimationPhase =
  | "idle"
  | "rolling"
  | "moving"
  | "done";

export interface Reaction {
  emoji: string;
  playerId: string;
  timestamp: number;
}
