import type { AlgebraicNotation, Side } from "@blindfold-chess/types";

export type SkillLevel =
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10
  | 11
  | 12
  | 13
  | 14
  | 15
  | 16
  | 17
  | 18
  | 19
  | 20;

export type GameStatus = "in_progress" | "checkmate" | "stalemate" | "draw";

export type PlayerResult = "win" | "loss" | "draw";

export type AiGameSettings = {
  playerColor: Side;
  skillLevel: SkillLevel;
};

export const DEFAULT_AI_GAME_SETTINGS: AiGameSettings = {
  playerColor: "white",
  skillLevel: 5,
};

export type AiGameResult = {
  playerColor: Side;
  skillLevel: SkillLevel;
  result: PlayerResult;
  moves: AlgebraicNotation[];
  moveCount: number;
};
