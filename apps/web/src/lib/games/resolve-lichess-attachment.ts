import { and, desc, eq, gt, sql } from 'drizzle-orm';
import 'server-only';

import { db, postGameAttachments } from '@/lib/db';

import { fetchLichessGamePgn } from './lichess';

/**
 * Reuse window for Lichess PGN fetches. If a row exists in
 * `post_game_attachments` for the same gameId and was created within
 * this many days, the stored PGN is reused instead of re-fetching.
 *
 * Trade-off: shorter values catch upstream deletions sooner, longer
 * values reduce outbound load. 30 days balances both per SPEC1 §6-1.
 */
const REUSE_WINDOW_DAYS = 30;

export type ResolvedLichessPgn =
  | { ok: true; pgn: string; canonicalUrl: string; reused: boolean }
  | {
      ok: false;
      error: 'invalid_id' | 'not_found' | 'rate_limited' | 'too_large' | 'fetch_failed';
    };

/**
 * Resolve the PGN for a Lichess game by ID, preferring a recent DB-cached
 * copy over a fresh fetch.
 *
 * @param gameId — canonical 8-character Lichess game ID. Validation happens
 *   inside `fetchLichessGamePgn`; on a malformed ID the DB lookup is skipped
 *   and the underlying fetcher returns `{ ok: false, error: 'invalid_id' }`.
 *
 * @design Why reuse lives outside the fetcher
 *
 * `fetchLichessGamePgn` is intentionally side-effect-free (no DB) so it
 * can be unit-tested with a fake `fetch` and a fake throttle. The DB
 * reuse policy is application-level — when / how long to reuse depends
 * on the attachment domain, not on Lichess. Keeping the two layers
 * separate also means a future rewrite of the cache (e.g. Redis) does
 * not require changing the network code.
 */
export async function resolveLichessAttachmentPgn(gameId: string): Promise<ResolvedLichessPgn> {
  // Cheap guard: skip the DB lookup for obviously malformed IDs so we
  // hand them straight to the fetcher, which returns `invalid_id`
  // through the same code path.
  if (/^[a-zA-Z0-9]{8}$/.test(gameId)) {
    const reused = await db
      .select({ pgn: postGameAttachments.pgn })
      .from(postGameAttachments)
      .where(
        and(
          eq(postGameAttachments.source, 'lichess'),
          eq(postGameAttachments.sourceGameId, gameId),
          gt(
            postGameAttachments.createdAt,
            sql`now() - ${REUSE_WINDOW_DAYS}::int * interval '1 day'`
          )
        )
      )
      .orderBy(desc(postGameAttachments.createdAt))
      .limit(1);

    if (reused.length > 0) {
      return {
        ok: true,
        pgn: reused[0].pgn,
        canonicalUrl: `https://lichess.org/${gameId}`,
        reused: true,
      };
    }
  }

  const fetched = await fetchLichessGamePgn(gameId);
  if (!fetched.ok) return fetched;
  return {
    ok: true,
    pgn: fetched.pgn,
    canonicalUrl: fetched.canonicalUrl,
    reused: false,
  };
}
