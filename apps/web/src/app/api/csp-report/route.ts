import { NextResponse } from 'next/server';

import * as Sentry from '@sentry/nextjs';

/**
 * Receives CSP violation reports and forwards them to Sentry.
 *
 * Two report formats arrive here depending on the browser / directive used:
 *
 * - Legacy `Content-Security-Policy-Report-Only` / `report-uri`:
 *   Content-Type: `application/csp-report` with `{ "csp-report": { ... } }`.
 * - Modern `Reporting-API` (`report-to`):
 *   Content-Type: `application/reports+json` with an array of report
 *   objects, each with a `body` field containing the CSP violation.
 *
 * The endpoint is intentionally unauthenticated — browsers do not attach
 * cookies / CSRF tokens to these beacon requests, and requiring them would
 * silently drop every report. Because it is therefore an open, unbounded
 * firehose, these guards keep it from exhausting the Sentry quota (which it
 * previously did, taking the whole project's error reporting offline):
 *   - The request body is read under a hard byte cap (see `MAX_REPORT_BYTES`).
 *     Anything larger is refused without being buffered.
 *   - Reports with no directive are dropped. A well-formed CSP report always
 *     names a directive; payloads without one are empty Safari reports or junk
 *     POSTed by bots, carry no actionable data, and were ~half the volume.
 *   - Reports from crawlers are dropped (see `isCrawlerUserAgent`).
 *   - Reports blamed on a browser extension's own assets are dropped (see
 *     `EXTENSION_INJECTED_HOSTS`) — they describe the visitor's software, not
 *     this site, and no code change here could ever resolve them.
 *   - The directive that becomes a Sentry tag and fingerprint is clamped to the
 *     known CSP directive names (see `canonicalDirective`), so a caller cannot
 *     mint unbounded tag values or issue groups.
 *   - The remainder is probabilistically sampled (see `cspReportSampleRate`)
 *     so the forwarded volume is bounded regardless of report content or abuse.
 *
 * What is deliberately NOT done here: a per-IP rate limit. The limiter this repo
 * has (`@/lib/security/rate-limit-ip`) writes a row to Postgres per request,
 * which costs more than the work it would prevent — parsing a small JSON body
 * and, one time in ten, a Sentry call. Capping the *invocation* volume of an
 * open beacon endpoint has to happen before the function runs (edge firewall /
 * WAF rule), not inside it.
 *
 * Responds 204 (no body) on every path except an oversized body, which gets 413,
 * so a real browser never sees anything that would make it retry or log a
 * failure. No legitimate CSP report approaches the cap.
 */

/**
 * Hard cap on the request body, in bytes.
 *
 * A single CSP report is well under 1 KB — the spec caps `script-sample` at 40
 * characters — and a `reports+json` batch holds a handful of them. 64 KB leaves
 * two orders of magnitude of headroom while making an unbounded `request.text()`
 * impossible: without this, any caller could hold arbitrary memory in the
 * function by POSTing a large body to a public URL.
 */
const MAX_REPORT_BYTES = 64 * 1024;

/**
 * Directive names that may become a Sentry tag value / fingerprint component.
 *
 * The reported directive is attacker-controlled on an open endpoint, and it is
 * used both as `tags.csp_directive` and in `fingerprint`. Feeding it through
 * unclamped lets a caller create an unbounded number of distinct tag values and
 * Sentry issues — the same quota exhaustion this endpoint already caused once,
 * reached by a different route. Anything unrecognised collapses to `other`; the
 * raw string is still forwarded in `extra`, which is not indexed.
 */
const KNOWN_CSP_DIRECTIVES = new Set([
  'base-uri',
  'block-all-mixed-content',
  'child-src',
  'connect-src',
  'default-src',
  'font-src',
  'form-action',
  'frame-ancestors',
  'frame-src',
  'img-src',
  'manifest-src',
  'media-src',
  'navigate-to',
  'object-src',
  'plugin-types',
  'prefetch-src',
  'referrer',
  'report-to',
  'report-uri',
  'require-trusted-types-for',
  'sandbox',
  'script-src',
  'script-src-attr',
  'script-src-elem',
  'style-src',
  'style-src-attr',
  'style-src-elem',
  'trusted-types',
  'upgrade-insecure-requests',
  'worker-src',
]);

/**
 * Reduce a reported directive to a bounded label.
 *
 * Legacy `violated-directive` carries the whole directive *value*
 * (`"script-src 'self' https://..."`), so only the first token is meaningful;
 * modern `effective-directive` is already just the name.
 */
function canonicalDirective(directive: string): string {
  const name = directive.trim().split(/\s+/, 1)[0]?.toLowerCase() ?? '';
  return KNOWN_CSP_DIRECTIVES.has(name) ? name : 'other';
}

/**
 * Read the body as text, refusing anything over `MAX_REPORT_BYTES`.
 *
 * Returns `null` when the cap is exceeded. The `Content-Length` header is
 * checked first as a cheap reject, but it is caller-supplied and may be absent
 * or wrong, so the stream is also counted as it arrives and abandoned the moment
 * the budget is blown — the point is never to buffer the whole thing.
 */
async function readBodyWithinLimit(request: Request): Promise<string | null> {
  const declaredLength = Number(request.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_REPORT_BYTES) return null;

  const body = request.body;
  if (body === null) return '';

  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_REPORT_BYTES) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  return new TextDecoder().decode(concat(chunks, total));
}

function concat(chunks: readonly Uint8Array[], total: number): Uint8Array {
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return merged;
}

/**
 * Fraction (0..1) of CSP reports forwarded to Sentry.
 *
 * Defaults to full fidelity in dev/test and a hard 10% cap in production so a
 * deploy stops the bleeding without any extra configuration step. Override
 * with the `CSP_REPORT_SAMPLE_RATE` env var (e.g. raise it back toward 1 once
 * the noisy sources are fixed, or lower it further during an incident).
 *
 * The parse/clamp is exported separately from the env read: this endpoint is
 * open and attacker-reachable, so the branches that decide whether a bad
 * value floods the Sentry quota (NaN, negative, above 1, empty string) are
 * worth asserting directly rather than only through an HTTP-level test.
 */
export function parseCspReportSampleRate(raw: string | undefined, isProduction: boolean): number {
  if (raw !== undefined) {
    const n = Number(raw);
    if (Number.isFinite(n) && n >= 0 && n <= 1) return n;
  }
  return isProduction ? 0.1 : 1;
}

function cspReportSampleRate(): number {
  return parseCspReportSampleRate(
    process.env.CSP_REPORT_SAMPLE_RATE,
    process.env.NODE_ENV === 'production'
  );
}

/**
 * User-Agent substrings that identify a crawler / automated fetcher rather
 * than a real user's browser.
 *
 * Crawler-sourced reports are dropped because they say nothing about what our
 * users experience: a crawler's engine may enforce CSP without honoring
 * nonces, or re-parse the HTML in a way that loses the `nonce` attribute, and
 * then reports a violation for markup that is provably correct. Observed
 * 2026-07-25 as a `script-src-elem` / `blocked-uri: inline` report from
 * `meta-externalagent` against `/ja/u/<name>`, where every `<script>` in the
 * served document carries a nonce matching the response header.
 *
 * `headless` is deliberately NOT in the list: HeadlessChrome covers Lighthouse
 * / PageSpeed and our own Playwright runs, which drive a real Chrome and can
 * surface real violations worth seeing.
 */
const CRAWLER_UA_PATTERN =
  /bot\b|bot\/|crawler|spider|externalhit|externalagent|slurp|scrapy|python-requests|curl\/|wget\//i;

function isCrawlerUserAgent(userAgent: string | null): boolean {
  return userAgent !== null && CRAWLER_UA_PATTERN.test(userAgent);
}

/**
 * Hosts that only ever appear in a violation because a browser extension
 * injected its own markup/CSS into our page.
 *
 * These are unfixable from our side and must NOT be allow-listed: the asset
 * belongs to software the visitor installed, not to anything this app ships,
 * and naming it in the policy would widen the allow-list for a third party we
 * neither vet nor control. Dropping the report is the only action available,
 * so drop it here rather than let it masquerade as a live site defect.
 *
 * Observed 2026-08 as `font-src` violations for the web-font each extension
 * pulls in with its overlay UI:
 * - `aceify.ai` — KaTeX fonts for an answer-overlay extension.
 * - `migaku-public-data.migaku.com` — Migaku (language-learning) reader UI.
 * - `themes.googleusercontent.com` — a legacy Google Fonts mirror, seen over
 *   plain `http:` from an extension's stylesheet; the app's own fonts are
 *   self-hosted via `next/font` and never touch this host.
 *
 * Keep the list short and evidence-based: add a host only after confirming in
 * Sentry that the app itself never requests it. An entry that turns out to be
 * ours would silently hide a real violation.
 */
const EXTENSION_INJECTED_HOSTS = new Set([
  'aceify.ai',
  'migaku-public-data.migaku.com',
  'themes.googleusercontent.com',
]);

export async function POST(request: Request): Promise<NextResponse> {
  const contentType = request.headers.get('content-type') ?? '';

  if (isCrawlerUserAgent(request.headers.get('user-agent'))) {
    return new NextResponse(null, { status: 204 });
  }

  try {
    const raw = await readBodyWithinLimit(request);

    if (raw === null) {
      return new NextResponse(null, { status: 413 });
    }

    if (!raw) {
      return new NextResponse(null, { status: 204 });
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // Malformed body — acknowledge without noise.
      return new NextResponse(null, { status: 204 });
    }

    const sampleRate = cspReportSampleRate();
    const violations = extractViolations(parsed, contentType);

    for (const violation of violations) {
      const directive = toStringOrUndefined(
        violation['effective-directive'] ??
          violation['violated-directive'] ??
          violation.effectiveDirective
      );

      // Drop directive-less reports (empty Safari reports / bot junk). They
      // are unactionable and were roughly half the flood.
      if (!directive) continue;

      const blockedUri = toStringOrUndefined(violation['blocked-uri'] ?? violation.blockedURL);

      // Drop violations caused by extension-injected content (see the host
      // list above) — nothing in this repo can fix them.
      const blockedHost = hostOf(blockedUri);
      if (blockedHost !== undefined && EXTENSION_INJECTED_HOSTS.has(blockedHost)) continue;

      // Bound the forwarded volume so this open endpoint can never exhaust the
      // Sentry quota again, independent of report content or abuse.
      if (Math.random() >= sampleRate) continue;

      // Bound the indexed forms of the directive: `tags` and `fingerprint` are
      // both attacker-reachable on an open endpoint. The raw value survives in
      // `extra.violatedDirective` below.
      const directiveLabel = canonicalDirective(directive);

      Sentry.captureMessage('CSP violation', {
        level: 'warning',
        // Group by directive so a single noisy directive no longer escalates
        // one project-wide mega-issue.
        fingerprint: ['csp-violation', directiveLabel],
        tags: {
          csp_directive: directiveLabel,
          blocked_scheme: schemeOf(blockedUri),
          // Host of the blocked URI — lets Sentry's tag breakdown enumerate
          // exactly which third-party domains need allow-listing.
          blocked_host: hostOf(blockedUri),
        },
        extra: {
          blockedUri: violation['blocked-uri'] ?? violation.blockedURL,
          // The directive exactly as reported, before `canonicalDirective`
          // clamped the tag. Carried explicitly because `violatedDirective`
          // below reads two spellings and misses `effective-directive`, so on a
          // modern report it would otherwise be the clamped label or nothing.
          rawDirective: directive,
          violatedDirective: violation['violated-directive'] ?? violation.effectiveDirective,
          documentUri: violation['document-uri'] ?? violation.documentURL,
          sourceFile: violation['source-file'] ?? violation.sourceFile,
          lineNumber: violation['line-number'] ?? violation.lineNumber,
          scriptSample: violation['script-sample'] ?? violation.sample,
          userAgent: request.headers.get('user-agent') ?? undefined,
        },
      });
    }
  } catch (error) {
    // Never let the reporting endpoint throw — log and swallow.
    Sentry.captureException(error);
  }

  return new NextResponse(null, { status: 204 });
}

type CspViolation = Record<string, unknown>;

/**
 * Normalize the two report payload shapes into a flat list of violation
 * objects so the Sentry bridge above can process them uniformly.
 */
function extractViolations(parsed: unknown, contentType: string): CspViolation[] {
  if (contentType.includes('application/reports+json') && Array.isArray(parsed)) {
    return parsed
      .map((entry): CspViolation | null => {
        if (!isRecord(entry)) return null;
        const body = entry.body;
        return isRecord(body) ? (body as CspViolation) : null;
      })
      .filter((v): v is CspViolation => v !== null);
  }

  if (isRecord(parsed) && isRecord(parsed['csp-report'])) {
    return [parsed['csp-report'] as CspViolation];
  }

  if (isRecord(parsed)) {
    return [parsed as CspViolation];
  }

  return [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toStringOrUndefined(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function schemeOf(uri: string | undefined): string | undefined {
  if (!uri) return undefined;
  const idx = uri.indexOf(':');
  return idx > 0 ? uri.slice(0, idx) : undefined;
}

/**
 * Host of the blocked URI, or `undefined` if there isn't a plausible one.
 *
 * This becomes a Sentry tag, and on an open endpoint its input is
 * attacker-supplied, so values that could not be a real host are rejected
 * rather than indexed: 253 octets is the DNS name ceiling, and a host that is
 * not made of name/IP-literal characters is not one either. Real hosts are
 * unaffected — the tag keeps doing its job of enumerating which third-party
 * domains need allow-listing.
 */
function hostOf(uri: string | undefined): string | undefined {
  if (!uri) return undefined;
  try {
    const { host } = new URL(uri);
    if (!host || host.length > 253) return undefined;
    return /^[A-Za-z0-9.\-:[\]]+$/.test(host) ? host : undefined;
  } catch {
    // Non-URL blocked-uri values ("inline", "eval", "self") have no host.
    return undefined;
  }
}
