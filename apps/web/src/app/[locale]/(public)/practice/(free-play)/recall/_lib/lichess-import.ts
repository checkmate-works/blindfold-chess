/**
 * Result shape for `_actions/importLichessGame`. Kept in a plain module (no
 * `"use server"`) so the action file can `import type` it internally rather
 * than re-exporting it — see the "Server Actions Convention" note in
 * apps/web/CLAUDE.md on why `export type` re-exports are unsafe in
 * `"use server"` files.
 */
export type ImportLichessGameResult =
  | { ok: true; pgn: string }
  | {
      ok: false;
      error:
        | 'not_lichess_url'
        | 'lichess_unsupported'
        // Re-asserted by `fetchLichessGamePgn` itself; unreachable here in
        // practice since `detectAttachmentInput` already validated the ID
        // shape, but kept in the union so its result type assigns cleanly.
        | 'invalid_id'
        | 'not_found'
        | 'rate_limited'
        | 'too_large'
        | 'fetch_failed';
    };
