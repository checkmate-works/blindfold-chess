'use server';

import { fetchLichessGamePgn } from '@/lib/games/lichess';
import { detectAttachmentInput } from '@/lib/games/validation';

import type { ImportLichessGameResult } from '../_lib/lichess-import';

/**
 * Import a Lichess game's PGN from a pasted game or embed URL, for the
 * recall setup screen's "paste a Lichess URL" convenience field.
 *
 * Reuses the same URL classifier and fetch client the topics attachment
 * flow already uses (`detectAttachmentInput` / `fetchLichessGamePgn`),
 * including its SSRF hardening and process-wide outbound throttle. No
 * additional per-user DB rate limit is layered on top: unlike topics,
 * recall is usable anonymously (no account required), so there is no
 * stable user identity to key a DB-backed limiter on — the process-wide
 * Lichess throttle is the only defense, same as it is for anonymous
 * callers of the topics flow's own fetch path.
 */
export async function importLichessGame(url: string): Promise<ImportLichessGameResult> {
  const detected = detectAttachmentInput(url);

  if (detected.kind === 'lichess_unsupported') {
    return { ok: false, error: 'lichess_unsupported' };
  }

  const gameId =
    detected.kind === 'lichess'
      ? detected.gameId
      : detected.kind === 'lichess_embed'
        ? detected.embedId
        : null;
  if (gameId === null) {
    return { ok: false, error: 'not_lichess_url' };
  }

  const result = await fetchLichessGamePgn(gameId);
  if (!result.ok) {
    return { ok: false, error: result.error };
  }
  return { ok: true, pgn: result.pgn };
}
