/**
 * Parse + validate a chess.com URL into the (platform, path) attribution
 * pair persisted on `post_game_pgn_attachments`.
 *
 * @description
 * chess.com forbids automated game-page scraping (TOS), so we cannot
 * fetch the PGN ourselves the way we do for Lichess. Users paste the
 * PGN manually and supply the chess.com URL purely for credit and
 * click-through. To make the rendered href provably safe regardless of
 * what later lands in the persisted row, the URL is decomposed at
 * write time into:
 *   - `attributionPlatform: 'chesscom'` — fixed allow-list, never
 *     trusts hostname strings beyond the parser
 *   - `attributionPath: '/...'` — the URL pathname only, validated
 *     against a strict character + length allow-list
 * The renderer then concatenates `https://www.chess.com${path}` from
 * those validated components — it never reads the persisted source URL
 * back into a clickable href.
 *
 * @design hostname allow-list is exact, not pattern
 *
 * The protocol / userinfo / hostname front half is `parseAllowedHostUrl`,
 * shared with `parse-embed-url.ts`. See its TSDoc for the attack classes the
 * exact-match hostname rule collapses into a single `wrong_host`. No
 * `maxLength` is passed: this parser persists only the pathname, whose own
 * 128-char regex below is the width that matters.
 *
 * @design path regex is conservative
 *
 * Allowed characters are `[A-Za-z0-9/_-]`. This excludes `.`, `?`, `#`,
 * `;`, `+`, `%`, parens, etc. — all of which can land in a chess.com
 * path but are not necessary for attribution rendering. Any URL that
 * would otherwise carry a query string or fragment (`?next=evil`,
 * `#x`) is reduced to its `pathname` by `new URL(...)` before the
 * regex sees it, so the query / fragment never reach the persisted
 * row. Maximum length 128 keeps the persisted column small and the
 * regex fast.
 */
import { type AllowedHostUrlFailure, parseAllowedHostUrl } from './allowed-host-url';

export type ChesscomAttribution = {
  attributionPlatform: 'chesscom';
  attributionPath: string;
};

export type ParseChesscomAttributionResult =
  | { ok: true; value: ChesscomAttribution }
  | {
      ok: false;
      // `input_too_long` is unreachable here — no `maxLength` is passed — but
      // stays in the union so the reason vocabulary matches the embed parsers.
      reason: AllowedHostUrlFailure | 'invalid_path';
    };

const CHESSCOM_HOSTNAME = 'www.chess.com';
const CHESSCOM_PATH_RE = /^\/[A-Za-z0-9/_-]{1,128}$/;

/**
 * Validate `input` as a chess.com URL and return the (platform, path)
 * pair to persist, or a failure reason.
 *
 * `input` should already be trimmed by the caller. The function never
 * throws — bad inputs return `{ ok: false, reason }`.
 */
export function parseChesscomAttribution(input: string): ParseChesscomAttributionResult {
  const parsed = parseAllowedHostUrl(input, { hostname: CHESSCOM_HOSTNAME });
  if (!parsed.ok) {
    return parsed;
  }
  const { url } = parsed;

  if (!CHESSCOM_PATH_RE.test(url.pathname)) {
    return { ok: false, reason: 'invalid_path' };
  }

  return {
    ok: true,
    value: { attributionPlatform: 'chesscom', attributionPath: url.pathname },
  };
}
