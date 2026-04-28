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
 * The hostname check is `=== 'www.chess.com'` rather than a regex so
 * the following classes of attack all collapse to `wrong_host` without
 * needing per-attack rules:
 *   - bare apex (`chess.com`) → wrong_host (we want a single canonical
 *     hostname for analytics + attribution clarity)
 *   - subdomain takeover targets (`m.chess.com`, `staging.chess.com`)
 *   - lookalike suffix (`www.chess.com.evil.tld`)
 *   - punycode / IDN homograph (`xn--chss-3qa.com`)
 *   - userinfo-prefix trick (`https://www.chess.com@evil.tld/...`) —
 *     the WHATWG URL parser puts `evil.tld` in `hostname`, so even
 *     before the `username !== ''` check this already fails the
 *     allow-list. Both checks remain so the parser stays correct
 *     under future engine quirks.
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

export type ChesscomAttribution = {
  attributionPlatform: 'chesscom';
  attributionPath: string;
};

export type ParseChesscomAttributionResult =
  | { ok: true; value: ChesscomAttribution }
  | {
      ok: false;
      reason: 'invalid_url' | 'wrong_protocol' | 'has_userinfo' | 'wrong_host' | 'invalid_path';
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
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return { ok: false, reason: 'invalid_url' };
  }

  if (url.protocol !== 'https:') {
    return { ok: false, reason: 'wrong_protocol' };
  }

  // userinfo block defense: `https://www.chess.com@evil.tld/foo` parses
  // with hostname = 'evil.tld' and username = 'www.chess.com'. The
  // hostname check below would already reject this, but we surface a
  // distinct error so the failure mode is unambiguous in logs / tests.
  if (url.username !== '' || url.password !== '') {
    return { ok: false, reason: 'has_userinfo' };
  }

  if (url.hostname !== CHESSCOM_HOSTNAME) {
    return { ok: false, reason: 'wrong_host' };
  }

  if (!CHESSCOM_PATH_RE.test(url.pathname)) {
    return { ok: false, reason: 'invalid_path' };
  }

  return {
    ok: true,
    value: { attributionPlatform: 'chesscom', attributionPath: url.pathname },
  };
}
