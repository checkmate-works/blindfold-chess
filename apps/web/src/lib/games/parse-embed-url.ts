/**
 * Parse + validate iframe embed URLs into the (provider, embedId) pair
 * persisted on `post_game_embed_attachments`.
 *
 * @description
 * SPEC2 / Phase B accepts two embed URL shapes:
 *   - chess.com emboard: `https://www.chess.com/emboard?id={diagramId}`
 *   - Lichess embed:    `https://lichess.org/embed/{gameId}` or
 *                       `https://lichess.org/embed/game/{gameId}`
 *     (Lichess Share → Embed currently emits the `/embed/game/{id}`
 *     shape; both forms reference the same canonical 8-char gameId,
 *     so Phase 13 (#83) accepts both and normalizes to the same
 *     `embedId` for downstream PGN auto-fetch via
 *     `https://lichess.org/api/game/{id}/pgn`.)
 *
 * In both cases we decompose the URL at write time into a discriminator
 * (`'chesscom'` | `'lichess'`) plus the validated provider-specific
 * `embedId`, so the renderer can rebuild the iframe `src` server-side
 * from the validated pair instead of trusting any persisted URL.
 *
 * @design Hostname allow-list is exact, not pattern
 *
 * As in `chesscom-attribution.ts`, the hostname check is `===` against a
 * single canonical string. This collapses the following attacks to a
 * single `wrong_host` reason without per-attack rules:
 *   - bare apex (`chess.com`) → `wrong_host`
 *   - subdomain (`m.chess.com`, `www.lichess.org`) → `wrong_host`
 *   - suffix lookalike (`www.chess.com.evil.tld`) → `wrong_host`
 *   - punycode / IDN homograph (`xn--chss-3qa.com`) → `wrong_host`
 *   - userinfo-prefix trick (`https://www.chess.com@evil.tld/...`) — the
 *     WHATWG URL parser puts `evil.tld` in `hostname`, so the allow-list
 *     check already fails. The dedicated userinfo check stays as a
 *     belt-and-braces guard against future engine quirks.
 *
 * @design Strict pathname / query
 *
 * - chess.com: pathname must equal `/emboard` exactly. Trailing segments
 *   are rejected with `invalid_path`. The `id` query parameter is the
 *   only piece of state we read; everything else (`extra`, tracking
 *   params, etc.) is silently ignored as long as `id` parses.
 * - Lichess: pathname must match `^/embed(?:/game)?/{8-alnum}$` exactly
 *   — i.e. either `/embed/{id}` (PGN-viewer widget shape) or
 *   `/embed/game/{id}` (the shape Lichess Share → Embed currently
 *   produces). Trailing segments and missing IDs are rejected with
 *   `invalid_path`. Query strings are tolerated (we discard them — the
 *   renderer adds its own `?theme=auto&bg=auto`).
 *
 * @design `embed_id` re-validation
 *
 * After URL parsing, the extracted `embedId` is checked against a
 * per-provider regex so a future URL parser quirk that lets a malformed
 * id slip through still trips at the application layer:
 *   - chess.com: `^[0-9]{1,15}$` (numeric diagram id)
 *   - Lichess:   `^[A-Za-z0-9]{8}$` (canonical 8-char game id)
 *
 * The DB CHECK (`^[A-Za-z0-9_-]{1,64}$`) is the backstop; the per-provider
 * regex above is the stricter forward defense.
 *
 * @design No throws, no fragments
 *
 * The parsers never throw — bad inputs return `{ ok: false, reason }`.
 * URL fragments (`#whatever`) are explicitly rejected with
 * `fragment_not_allowed` so a hostile fragment cannot ride along even
 * though browsers would discard it before sending.
 *
 * Inputs longer than 512 chars are rejected with `input_too_long`,
 * matching the persisted `source_url` column width.
 */

const CHESSCOM_HOSTNAME = 'www.chess.com';
const CHESSCOM_EMBED_PATH = '/emboard';
/**
 * chess.com diagram IDs are numeric and currently fit comfortably in
 * 15 digits. The DB CHECK admits up to 64 chars from `[A-Za-z0-9_-]`;
 * the per-provider regex below is intentionally tighter.
 */
const CHESSCOM_EMBED_ID_RE = /^[0-9]{1,15}$/;

const LICHESS_HOSTNAME = 'lichess.org';
// Accepts both `/embed/{8-alnum}` (PGN-viewer widget URL) and
// `/embed/game/{8-alnum}` (the shape Lichess Share → Embed currently
// emits). Phase 13 (#83) routes both to the same PGN auto-fetch path
// keyed by the captured 8-char gameId, so downstream code does not
// need to track which shape the user pasted.
const LICHESS_EMBED_PATH_RE = /^\/embed(?:\/game)?\/([A-Za-z0-9]{8})$/;
/**
 * Mirrors `LICHESS_GAME_ID_RE` in `./lichess.ts`. Defined locally rather
 * than imported so the embed parser does not drag the server-only
 * Lichess fetch module (`'server-only'` directive) into bundlers that
 * may try to eagerly resolve it. The two regexes are intentionally
 * identical; if one ever tightens, the other should too.
 */
const LICHESS_EMBED_ID_RE = /^[A-Za-z0-9]{8}$/;

const MAX_INPUT_LENGTH = 512;

type EmbedAttachment =
  | { provider: 'chesscom'; embedId: string }
  | { provider: 'lichess'; embedId: string };

export type ParseEmbedUrlResult =
  | { ok: true; value: EmbedAttachment }
  | {
      ok: false;
      reason:
        | 'invalid_url'
        | 'wrong_protocol'
        | 'has_userinfo'
        | 'wrong_host'
        | 'invalid_path'
        | 'invalid_id'
        | 'fragment_not_allowed'
        | 'input_too_long';
    };

/**
 * Validate `input` as a chess.com emboard URL and return the
 * `(provider='chesscom', embedId)` pair, or a failure reason.
 *
 * `input` should already be trimmed by the caller. The function never
 * throws — bad inputs return `{ ok: false, reason }`.
 */
export function parseChesscomEmboardUrl(input: string): ParseEmbedUrlResult {
  if (input.length > MAX_INPUT_LENGTH) {
    return { ok: false, reason: 'input_too_long' };
  }

  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return { ok: false, reason: 'invalid_url' };
  }

  if (url.protocol !== 'https:') {
    return { ok: false, reason: 'wrong_protocol' };
  }

  if (url.username !== '' || url.password !== '') {
    return { ok: false, reason: 'has_userinfo' };
  }

  if (url.hostname !== CHESSCOM_HOSTNAME) {
    return { ok: false, reason: 'wrong_host' };
  }

  if (url.pathname !== CHESSCOM_EMBED_PATH) {
    return { ok: false, reason: 'invalid_path' };
  }

  if (url.hash !== '') {
    return { ok: false, reason: 'fragment_not_allowed' };
  }

  const embedId = url.searchParams.get('id');
  if (!embedId || !CHESSCOM_EMBED_ID_RE.test(embedId)) {
    return { ok: false, reason: 'invalid_id' };
  }

  return { ok: true, value: { provider: 'chesscom', embedId } };
}

/**
 * Validate `input` as a Lichess embed URL and return the
 * `(provider='lichess', embedId)` pair, or a failure reason.
 *
 * `input` should already be trimmed by the caller. The function never
 * throws — bad inputs return `{ ok: false, reason }`.
 */
export function parseLichessEmbedUrl(input: string): ParseEmbedUrlResult {
  if (input.length > MAX_INPUT_LENGTH) {
    return { ok: false, reason: 'input_too_long' };
  }

  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return { ok: false, reason: 'invalid_url' };
  }

  if (url.protocol !== 'https:') {
    return { ok: false, reason: 'wrong_protocol' };
  }

  if (url.username !== '' || url.password !== '') {
    return { ok: false, reason: 'has_userinfo' };
  }

  if (url.hostname !== LICHESS_HOSTNAME) {
    return { ok: false, reason: 'wrong_host' };
  }

  if (url.hash !== '') {
    return { ok: false, reason: 'fragment_not_allowed' };
  }

  const match = url.pathname.match(LICHESS_EMBED_PATH_RE);
  if (!match) {
    return { ok: false, reason: 'invalid_path' };
  }

  const embedId = match[1];
  if (!LICHESS_EMBED_ID_RE.test(embedId)) {
    return { ok: false, reason: 'invalid_id' };
  }

  return { ok: true, value: { provider: 'lichess', embedId } };
}
