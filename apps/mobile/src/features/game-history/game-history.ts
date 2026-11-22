import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Side } from "@blindfold-chess/types";

/** One finished game against the engine, as kept on the device. */
export type SavedGame = {
  id: string;
  /** ISO timestamp of the game's end. */
  finishedAt: string;
  playerColor: Side;
  skillLevel: number;
  result: "win" | "loss" | "draw";
  /** SAN moves from the start position (or `startingFen`). */
  moves: string[];
  startingFen?: string;
};

/** Games kept; the oldest is dropped past this. */
export const MAX_SAVED_GAMES = 50;

const STORAGE_KEY = "AI_GAME_HISTORY";

function isSavedGame(value: unknown): value is SavedGame {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.finishedAt === "string" &&
    (v.playerColor === "white" || v.playerColor === "black") &&
    typeof v.skillLevel === "number" &&
    (v.result === "win" || v.result === "loss" || v.result === "draw") &&
    Array.isArray(v.moves) &&
    v.moves.every((m) => typeof m === "string") &&
    (v.startingFen === undefined || typeof v.startingFen === "string")
  );
}

/** Reads a stored payload, dropping anything that is not a saved game. */
export function parseSavedGames(raw: string | null): SavedGame[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isSavedGame) : [];
  } catch {
    return [];
  }
}

/** Newest first, capped at {@link MAX_SAVED_GAMES}. */
export function withGameAdded(
  games: SavedGame[],
  game: SavedGame,
): SavedGame[] {
  return [game, ...games.filter((g) => g.id !== game.id)].slice(
    0,
    MAX_SAVED_GAMES,
  );
}

export async function loadSavedGames(): Promise<SavedGame[]> {
  return parseSavedGames(await AsyncStorage.getItem(STORAGE_KEY));
}

export async function saveGame(game: SavedGame): Promise<void> {
  const games = await loadSavedGames();
  await AsyncStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(withGameAdded(games, game)),
  );
}

export async function deleteSavedGame(id: string): Promise<void> {
  const games = await loadSavedGames();
  await AsyncStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(games.filter((g) => g.id !== id)),
  );
}
