import { UUID_RE } from '@/lib/validations/uuid';

/**
 * The game move a chunk is being authored from, carried from the shared
 * game's "create from this position" menu through to the create action,
 * which links the new chunk to that move in the same transaction.
 *
 * @design why the whole pair travels together
 * `game_chunks` anchors a link at `(game_id, ply)` and `ply` is NOT NULL,
 * so a game without a move — or a move without its game — cannot address a
 * row. Modelling it as one optional object rather than two optional fields
 * makes the half-present state unrepresentable downstream, which is why
 * `parseChunkLinkTarget` returns all-or-nothing.
 */
export type ChunkLinkTarget = {
  gameId: string;
  /** 0-based index into `games.moves[]`. */
  ply: number;
};

/**
 * Read a link target out of `?game=<uuid>&ply=<n>` search params.
 *
 * Shape validation only — that the game exists, is visible, and that the
 * caller may link to it is re-checked server-side at insert time. A
 * malformed or half-present pair yields `undefined` so the create flow
 * degrades to a plain `?fen=` seed instead of failing: a stray URL should
 * cost the author the auto-link, not the chunk they came to write.
 */
export function parseChunkLinkTarget(
  gameParam: string | string[] | undefined,
  plyParam: string | string[] | undefined
): ChunkLinkTarget | undefined {
  if (typeof gameParam !== 'string' || typeof plyParam !== 'string') return undefined;
  if (!UUID_RE.test(gameParam)) return undefined;
  // Digits only, matching how the replay's own `#<half-move>` fragment is
  // parsed. Neither `Number()` nor `parseInt` is safe on its own here:
  // `Number('')` and `Number(' ')` are 0 (an empty param would silently
  // mean the game's first move), `Number('1e3')` is 1000, and
  // `parseInt('3abc')` is 3 — each anchors a link to a move the caller
  // never named.
  if (!/^\d+$/.test(plyParam)) return undefined;
  const ply = Number(plyParam);
  if (!Number.isSafeInteger(ply)) return undefined;
  return { gameId: gameParam, ply };
}

/** Runtime shape check for a link target read back out of a stored draft. */
export function isChunkLinkTarget(value: unknown): value is ChunkLinkTarget {
  if (value === null || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  if (typeof v.gameId !== 'string' || !UUID_RE.test(v.gameId)) return false;
  return typeof v.ply === 'number' && Number.isInteger(v.ply) && v.ply >= 0;
}
