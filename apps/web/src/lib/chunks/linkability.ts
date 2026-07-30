import { type SQL, and, eq, or } from 'drizzle-orm';

import { chunks } from '@/lib/db/schema';

/**
 * "Published, or a draft owned by this viewer" — the eligibility rule for
 * linking a chunk to a game move (`game_chunks`).
 *
 * @design why own drafts are eligible
 * The rule the published-only picker catalog enforces is name stability —
 * don't let someone pin an assertion to a title that is still up for
 * renegotiation (see `getAllAvailableChunkOptions`). That risk is about
 * *other people's* unsettled names: the author of a draft is the one
 * person who knows what it will end up being called, and the only one who
 * can rename it.
 *
 * The concrete flow this unblocks is "create a chunk from this game
 * position" (`CreateFromPositionMenu`), which was a dead end for the
 * common case: a chunk authored from a position defaults to `draft` (the
 * workshop state the UGC flow steers toward), so it could not be linked
 * back to the very position it was extracted from.
 *
 * Note the axis is the *chunk's* owner, not the game's. `game_chunks` is a
 * suggestion layer with no game-owner veto by construction (see the table's
 * TSDoc), so game ownership was never what governed eligibility.
 *
 * Mirrors `validateAndDedupeTagIds`'s `requirePublishedChunks: false`
 * carve-out on the position create / update path — the same "own draft"
 * allowance, here actually reachable from the UI.
 *
 * Lives in its own leaf module (schema import only) so both halves — the
 * picker catalog in `lib/chunks/queries.ts` and the server-side gate in
 * `lib/db/game-chunks.ts` — can share it without either pulling in the
 * other's module graph. The two must never drift: an option the picker
 * offers has to survive the action's re-check.
 *
 * Soft-delete is NOT covered here; callers add `isNull(chunks.deletedAt)`
 * themselves, matching how they already compose their other predicates.
 */
export function linkableChunkPredicate(viewerId: string | null): SQL | undefined {
  const published = eq(chunks.status, 'published');
  if (!viewerId) return published;
  return or(published, and(eq(chunks.status, 'draft'), eq(chunks.userId, viewerId)));
}
