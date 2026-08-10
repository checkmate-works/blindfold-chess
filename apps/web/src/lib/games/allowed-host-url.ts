/**
 * The shared front half of every "parse a URL the user pasted from a chess
 * site" check.
 *
 * @description
 * `parse-embed-url.ts` and `chesscom-attribution.ts` each decompose a pasted
 * URL into validated components so the renderer can rebuild a safe href /
 * iframe `src` instead of trusting a persisted string. Their per-provider
 * tails differ — a query parameter, a path regex, a path allow-list — but the
 * front half is one rule reimplemented three times:
 *
 *   length → `new URL()` → `https:` → no userinfo → exact hostname
 *
 * It lives here so tightening it tightens every caller at once. The tails stay
 * with their callers; nothing here knows what a chess.com diagram id is.
 *
 * @design Hostname allow-list is exact, not pattern
 *
 * The check is `===` against a single canonical string rather than a regex or
 * a suffix test. That collapses the following to one `wrong_host` reason with
 * no per-attack rules:
 *   - bare apex (`chess.com`) → `wrong_host` (one canonical hostname keeps
 *     attribution and analytics unambiguous)
 *   - subdomain (`m.chess.com`, `staging.chess.com`, `www.lichess.org`)
 *   - suffix lookalike (`www.chess.com.evil.tld`)
 *   - punycode / IDN homograph (`xn--chss-3qa.com`)
 *   - userinfo-prefix trick (`https://www.chess.com@evil.tld/...`) — the
 *     WHATWG parser puts `evil.tld` in `hostname`, so the allow-list already
 *     rejects it before the userinfo check runs. Both checks stay: the
 *     dedicated `has_userinfo` reason makes the failure unambiguous in logs
 *     and tests, and it keeps the parser correct under future engine quirks.
 *
 * @design No throws
 *
 * Bad inputs return `{ ok: false, reason }`. Callers surface the reason
 * verbatim, so the reason strings are part of their public contract — the
 * union below is deliberately narrow and additive-only.
 */

/** Failure reasons this front half can produce. */
export type AllowedHostUrlFailure =
  'input_too_long' | 'invalid_url' | 'wrong_protocol' | 'has_userinfo' | 'wrong_host';

export type ParseAllowedHostUrlResult =
  { ok: true; url: URL } | { ok: false; reason: AllowedHostUrlFailure };

/**
 * Parse `input` and confirm it is an https URL on exactly `hostname`, with no
 * embedded credentials.
 *
 * `input` should already be trimmed by the caller. `maxLength` is optional
 * because only the callers that persist the raw string have a column width to
 * defend; omitting it skips the length check entirely rather than applying a
 * default nobody asked for.
 */
export function parseAllowedHostUrl(
  input: string,
  { hostname, maxLength }: { hostname: string; maxLength?: number }
): ParseAllowedHostUrlResult {
  if (maxLength !== undefined && input.length > maxLength) {
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

  if (url.hostname !== hostname) {
    return { ok: false, reason: 'wrong_host' };
  }

  return { ok: true, url };
}
