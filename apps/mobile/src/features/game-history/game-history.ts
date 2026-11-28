import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  isMoveOperationLog,
  type MoveOperationLog,
} from "@blindfold-chess/features/game-record";
import type { Side } from "@blindfold-chess/types";

/**
 * One game against the engine, as kept on the device. It is written after
 * every move, so a game that was left (or lost with the app) is still here
 * to pick up; `result` tells a finished game from one in progress.
 */
export type SavedGame = {
  id: string;
  /**
   * ISO timestamp of the last save: the game's end once it has a `result`,
   * the last move played until then. The name predates unfinished games
   * being saved and is kept so stored games still read.
   */
  finishedAt: string;
  playerColor: Side;
  skillLevel: number;
  /** Absent while the game is in progress. */
  result?: "win" | "loss" | "draw";
  /** SAN moves from the start position (or `startingFen`). */
  moves: string[];
  startingFen?: string;
  /** One log per player move; absent on games saved before it was kept. */
  operationLogs?: MoveOperationLog[];
  /**
   * The preferences the game is played under, to resume it as it was left.
   * Stored as written and validated where it is read.
   */
  gamePrefs?: Record<string, unknown>;
};

/** A saved game that can still be played on. */
export function isInProgress(game: SavedGame): boolean {
  return game.result === undefined;
}

/** How many of the saved games can still be played on. */
export function countInProgress(games: readonly SavedGame[]): number {
  return games.filter(isInProgress).length;
}

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
    (v.result === undefined ||
      v.result === "win" ||
      v.result === "loss" ||
      v.result === "draw") &&
    Array.isArray(v.moves) &&
    v.moves.every((m) => typeof m === "string") &&
    (v.startingFen === undefined || typeof v.startingFen === "string") &&
    (v.operationLogs === undefined ||
      (Array.isArray(v.operationLogs) &&
        v.operationLogs.every(isMoveOperationLog))) &&
    (v.gamePrefs === undefined ||
      (typeof v.gamePrefs === "object" && v.gamePrefs !== null))
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

const listeners = new Set<() => void>();

/**
 * Calls `listener` after every write to the saved games, for a view that
 * stays mounted while games are saved or deleted elsewhere (the play tab's
 * badge). Returns the unsubscribe function.
 */
export function subscribeToSavedGames(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Writes run one after another. Each is a read of the whole list followed by
 * a write of it, and a game is saved after every move: two of them
 * overlapping (the player's move, then the engine's reply a moment later)
 * would both read the old list and the second write would drop the first.
 */
let writes: Promise<void> = Promise.resolve();

function enqueueWrite(
  update: (games: SavedGame[]) => SavedGame[],
): Promise<void> {
  const run = async () => {
    const games = await loadSavedGames();
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(update(games)));
    for (const listener of listeners) listener();
  };
  // A failed write must not stop the ones queued behind it.
  writes = writes.then(run, run);
  return writes;
}

export function saveGame(game: SavedGame): Promise<void> {
  return enqueueWrite((games) => withGameAdded(games, game));
}

export function deleteSavedGame(id: string): Promise<void> {
  return enqueueWrite((games) => games.filter((g) => g.id !== id));
}

export async function loadSavedGame(id: string): Promise<SavedGame | null> {
  // After the queued writes, so a game saved a moment ago is found.
  await writes.catch(() => undefined);
  return (await loadSavedGames()).find((g) => g.id === id) ?? null;
}
