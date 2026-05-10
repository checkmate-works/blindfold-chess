/**
 * Parse + validate a user-supplied YouTube URL into the
 * `(provider='youtube', providerVideoId, sourceUrl)` triple persisted on
 * `post_video_attachments`.
 *
 * @description
 * Mirrors the `parseChesscomEmboardUrl` / `parseLichessEmbedUrl` shape in
 * `./parse-embed-url.ts` so the broader URL-parser family stays uniform:
 *   - never throws — bad inputs return `{ ok: false, reason, error }`
 *   - the result is a discriminated union so callers narrow with `if (!r.ok)`
 *   - the renderer rebuilds the iframe `src` from the validated
 *     `(provider, providerVideoId)` pair, never from the raw URL
 *
 * @design Pinned 9-step validation order
 *
 *   1. Reject inputs longer than 512 chars (matches the persisted
 *      `source_url` column width and bounds parser work on hostile pastes).
 *   2. WHATWG `new URL()` parse — anything that does not parse is rejected
 *      with `invalid_url`. This collapses `javascript:`, `data:`, and
 *      `vbscript:` style scheme attacks because step 3 then enforces https.
 *   3. Require `https:` protocol (`protocol_not_https`).
 *   4. Reject any userinfo (`user:pass@host`). Belt-and-braces against the
 *      WHATWG userinfo trick (`https://www.youtube.com@evil.tld/...`),
 *      where the parser puts `evil.tld` in `hostname` — step 6 already
 *      catches it, but the explicit userinfo check fires first and gives
 *      a clearer reason.
 *   5. Reject any URL fragment (`#whatever`). Browsers discard fragments
 *      before sending, so a hostile fragment is not exploitable here, but
 *      we reject so the persisted `source_url` is fragment-free and the
 *      audit trail matches what the renderer would produce.
 *   6. Hostname allow-list (lower-case exact match — WHATWG already
 *      lowercases). Suffix lookalikes
 *      (`www.youtube.com.attacker.tld`), IDN homographs
 *      (`xn--youtub-zwa.com`), and apex-with-path tricks
 *      (`attacker.tld/www.youtube.com/...`) all collapse to
 *      `host_not_allowed`.
 *   7. Per-host pathname matcher (anchored `^...$` regex). Reject anything
 *      with trailing segments (`/watch/extra`, `/embed/abc/def`).
 *      For `/watch?v={ID}`, also enforce `getAll('v').length === 1` to
 *      reject HTTP parameter pollution
 *      (`?v=VALIDID0001&v=EVILID00002`).
 *   8. Re-validate the extracted id against `^[A-Za-z0-9_-]{11}$`. The
 *      pathname matcher above already enforces this for `/shorts/`,
 *      `/live/`, `/embed/`, and `youtu.be/{id}` shapes; the dedicated
 *      check is the universal backstop for `/watch?v=` ids and is the
 *      pin point for "the JS regex equals the DB CHECK regex" alignment
 *      (see test `youtube-validator.test.ts`).
 *   9. Return the discriminated-union result.
 *
 * @design Trim contract
 *
 * The parser does NOT trim its input. The Server Action trims once at the
 * top so that parser, INSERT, and length pre-checks all see the same
 * canonical value (Lessons §10 from #74). Step 1's length cap intentionally
 * runs against the raw input.
 *
 * `String.prototype.trim()` does NOT strip U+200B (zero-width space) or
 * other in-band invisible Unicode, so a ZWSP-padded id like
 * `VALIDID0001<U+200B>` will survive the action's trim, fail the pathname /
 * id regex (step 7 / step 8), and be rejected with `invalid_id`. A test
 * pins this for the regression-guard direction.
 *
 * @design Why `youtube-nocookie.com` is in the allow-list
 *
 * The renderer always uses `youtube-nocookie.com` for the iframe `src`,
 * but a user might paste a `youtube-nocookie.com/embed/{ID}` URL (e.g.
 * copied from another embed). Accepting it here means the same paste UX
 * works regardless of the YouTube host the user copied from, while the
 * render path stays canonical.
 */

const MAX_INPUT_LENGTH = 512;

const YOUTUBE_HOSTS = new Set([
  'www.youtube.com',
  'youtube.com',
  'youtu.be',
  'www.youtube-nocookie.com',
]);

/**
 * Canonical 11-character YouTube video id alphabet (URL-safe base64).
 * Byte-for-byte aligned with the DB CHECK regex on
 * `post_video_attachments.provider_video_id`. A static test
 * (`youtube-validator.test.ts`) pins the equivalence so a one-side
 * tightening cannot silently regress.
 */
export const YOUTUBE_VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/;

const PATHNAME_SHORTS_RE = /^\/shorts\/([A-Za-z0-9_-]{11})$/;
const PATHNAME_LIVE_RE = /^\/live\/([A-Za-z0-9_-]{11})$/;
const PATHNAME_EMBED_RE = /^\/embed\/([A-Za-z0-9_-]{11})$/;
const PATHNAME_YOUTU_BE_RE = /^\/([A-Za-z0-9_-]{11})$/;

export type YouTubeUrlReason =
  | 'input_too_long'
  | 'invalid_url'
  | 'protocol_not_https'
  | 'userinfo_present'
  | 'fragment_not_allowed'
  | 'host_not_allowed'
  | 'pathname_not_supported'
  | 'param_pollution'
  | 'invalid_id';

export type ParseYouTubeUrlResult =
  | {
      ok: true;
      value: {
        provider: 'youtube';
        providerVideoId: string;
        sourceUrl: string;
      };
    }
  | { ok: false; reason: YouTubeUrlReason; error: string };

const REASON_MESSAGE: Record<YouTubeUrlReason, string> = {
  input_too_long: 'URL is too long.',
  invalid_url: 'URL could not be parsed.',
  protocol_not_https: 'URL must use https.',
  userinfo_present: 'URL must not contain userinfo.',
  fragment_not_allowed: 'URL must not contain a fragment.',
  host_not_allowed: 'URL host is not a YouTube host.',
  pathname_not_supported: 'URL pathname is not a supported YouTube path.',
  param_pollution: 'URL contains repeated query parameters.',
  invalid_id: 'YouTube video id is invalid.',
};

function fail(reason: YouTubeUrlReason): ParseYouTubeUrlResult {
  return { ok: false, reason, error: REASON_MESSAGE[reason] };
}

/**
 * Match the pathname against per-host shapes and extract the
 * 11-character video id. Returns `null` if no shape matches.
 *
 * For `/watch?v={ID}` we also enforce HTTP parameter pollution defense
 * via `searchParams.getAll('v').length === 1`.
 */
function matchPathname(
  url: URL,
  hostname: string
): { id: string } | { paramPollution: true } | null {
  const { pathname, searchParams } = url;

  if (hostname === 'youtu.be') {
    const m = pathname.match(PATHNAME_YOUTU_BE_RE);
    return m ? { id: m[1] } : null;
  }

  if (hostname === 'www.youtube.com' || hostname === 'youtube.com') {
    if (pathname === '/watch') {
      // Reject param pollution before reading `get('v')` — otherwise we
      // would silently accept the first occurrence and ignore the
      // attacker-controlled second one.
      if (searchParams.getAll('v').length !== 1) {
        return { paramPollution: true };
      }
      const id = searchParams.get('v');
      return id !== null ? { id } : null;
    }
    const shorts = pathname.match(PATHNAME_SHORTS_RE);
    if (shorts) return { id: shorts[1] };
    const live = pathname.match(PATHNAME_LIVE_RE);
    if (live) return { id: live[1] };
    const embed = pathname.match(PATHNAME_EMBED_RE);
    if (embed) return { id: embed[1] };
    return null;
  }

  if (hostname === 'www.youtube-nocookie.com') {
    const m = pathname.match(PATHNAME_EMBED_RE);
    return m ? { id: m[1] } : null;
  }

  return null;
}

/**
 * Validate `input` as a YouTube URL and return the
 * `(provider='youtube', providerVideoId, sourceUrl)` triple, or a
 * failure reason. Never throws; bad inputs return
 * `{ ok: false, reason, error }`.
 *
 * `input` should be trimmed by the caller — see the trim contract in the
 * file-level TSDoc.
 */
export function parseYouTubeUrl(input: string): ParseYouTubeUrlResult {
  // step 1
  if (input.length > MAX_INPUT_LENGTH) {
    return fail('input_too_long');
  }

  // step 2
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return fail('invalid_url');
  }

  // step 3
  if (url.protocol !== 'https:') {
    return fail('protocol_not_https');
  }

  // step 4 — userinfo trick belt-and-braces
  if (url.username !== '' || url.password !== '') {
    return fail('userinfo_present');
  }

  // step 5
  if (url.hash !== '') {
    return fail('fragment_not_allowed');
  }

  // step 6
  if (!YOUTUBE_HOSTS.has(url.hostname)) {
    return fail('host_not_allowed');
  }

  // step 7
  const matched = matchPathname(url, url.hostname);
  if (matched === null) {
    return fail('pathname_not_supported');
  }
  if ('paramPollution' in matched) {
    return fail('param_pollution');
  }

  // step 8 — defense in depth. Pathname matchers already enforce the
  // 11-char alphabet for `/shorts/`, `/live/`, `/embed/`, and
  // `youtu.be/{id}` shapes; this re-check is the universal backstop and
  // the pin point for the JS-vs-DB-CHECK regex equivalence test.
  if (!YOUTUBE_VIDEO_ID_RE.test(matched.id)) {
    return fail('invalid_id');
  }

  // step 9 — persist the WHATWG-canonicalized URL string instead of the
  // raw `input`. `url.toString()` strips control bytes that the parser
  // silently dropped (most importantly NUL, which would otherwise trip
  // Postgres `22021 invalid_text_representation` on INSERT) and
  // normalizes percent-encoding. The renderer never reads sourceUrl, so
  // canonicalization here is purely an audit-trail and DB-layer
  // robustness measure.
  return {
    ok: true,
    value: {
      provider: 'youtube',
      providerVideoId: matched.id,
      sourceUrl: url.toString(),
    },
  };
}
