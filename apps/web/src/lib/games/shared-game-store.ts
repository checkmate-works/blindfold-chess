/**
 * Client-side registry mapping a localStorage game to its published copy.
 *
 * AI games live in localStorage under their own id; publishing creates a
 * server row with a *different* UUIDv7 id (plus, for account-less authors, a
 * manage token). We record `localGameId → { publishedId, manageToken }` here so
 * that:
 *   - the result screen can tell a game has already been shared and link
 *     straight to it instead of offering to publish again;
 *   - account-less authors keep the manage token needed to unpublish / delete /
 *     claim the game later, keyed by the game they actually recognise.
 *
 * Browser-only: every function no-ops / returns empty under SSR (`window`
 * guard), so it is safe to import anywhere but only does work client-side.
 */
import { readJson, writeJson } from '@/lib/persistent-settings/local-storage-adapter';

const STORAGE_KEY = 'blindfold_chess_shared_games';

export type SharedGameRecord = {
  /** Server-side UUIDv7 id of the published game. */
  publishedId: string;
  /** Manage-token secret, present only for account-less authors. */
  manageToken?: string;
};

function read(): Record<string, SharedGameRecord> {
  const parsed = readJson<unknown>(STORAGE_KEY, {});
  return parsed && typeof parsed === 'object' ? (parsed as Record<string, SharedGameRecord>) : {};
}

/**
 * Storage full / disabled loses the author the local link to their published
 * game, which is the accepted account-less fallback — `writeJson` swallows it.
 */
function write(map: Record<string, SharedGameRecord>): void {
  writeJson(STORAGE_KEY, map);
}

/** Record that `localGameId` was published as `publishedId` (with optional token). */
export function recordSharedGame(
  localGameId: string,
  publishedId: string,
  manageToken?: string
): void {
  if (typeof window === 'undefined') return;
  const map = read();
  map[localGameId] = manageToken ? { publishedId, manageToken } : { publishedId };
  write(map);
}

/** The published record for a localStorage game, or null if it was never shared from this browser. */
export function getSharedGame(localGameId: string): SharedGameRecord | null {
  return read()[localGameId] ?? null;
}

/**
 * Reverse lookup: find this browser's record for a published game id (the id
 * used in the public URL). Lets the detail page tell whether the viewer is the
 * account-less owner and recover the manage token for edit / delete.
 */
export function getSharedGameByPublishedId(
  publishedId: string
): { localGameId: string; record: SharedGameRecord } | null {
  for (const [localGameId, record] of Object.entries(read())) {
    if (record.publishedId === publishedId) return { localGameId, record };
  }
  return null;
}

/** Forget a mapping entirely (e.g. after the published game is deleted). */
export function removeSharedGame(localGameId: string): void {
  if (typeof window === 'undefined') return;
  const map = read();
  if (!(localGameId in map)) return;
  delete map[localGameId];
  write(map);
}

/**
 * Burn just the manage token after a successful claim, keeping the
 * `publishedId` mapping alive. The mapping is what the result screen and
 * play surface use to know "this game is already published" — removing the
 * whole record (via {@link removeSharedGame}) would make them offer to
 * publish the game again. After a claim, ownership rides on the session
 * (`games.author_id`), so the token is dead weight with real risk: anyone
 * with this browser's localStorage could otherwise still look like an owner.
 */
export function clearManageToken(localGameId: string): void {
  if (typeof window === 'undefined') return;
  const map = read();
  const record = map[localGameId];
  if (!record || record.manageToken === undefined) return;
  map[localGameId] = { publishedId: record.publishedId };
  write(map);
}
