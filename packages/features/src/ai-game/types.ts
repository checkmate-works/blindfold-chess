import type {
  AlgebraicNotation,
  FinalGameOutcome,
  Side,
} from "@blindfold-chess/types";

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

/**
 * The player's terminal result. An alias of the shared `FinalGameOutcome`
 * rather than a fourth spelling of the same three strings — this one, the exp
 * calculator's `GameExpOutcome`, and the web save action's `VALID_RESULTS`
 * were independent literals describing one set.
 */
export type PlayerResult = FinalGameOutcome;

/** Runtime list of {@link PlayerResult} members, for validating untyped input. */
export const PLAYER_RESULTS: readonly PlayerResult[] = ["win", "loss", "draw"];

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
