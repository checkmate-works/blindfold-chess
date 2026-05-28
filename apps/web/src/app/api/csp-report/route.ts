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
 * firehose, two guards keep it from exhausting the Sentry quota (which it
 * previously did, taking the whole project's error reporting offline):
 *   - Reports with no directive are dropped. A well-formed CSP report always
 *     names a directive; payloads without one are empty Safari reports or junk
 *     POSTed by bots, carry no actionable data, and were ~half the volume.
 *   - The remainder is probabilistically sampled (see `cspReportSampleRate`)
 *     so the forwarded volume is bounded regardless of report content or abuse.
 *
 * Always responds 204 (no body) regardless of parse success so the browser
 * does not retry or log failures.
 */

/**
 * Fraction (0..1) of CSP reports forwarded to Sentry.
 *
 * Defaults to full fidelity in dev/test and a hard 10% cap in production so a
 * deploy stops the bleeding without any extra configuration step. Override
 * with the `CSP_REPORT_SAMPLE_RATE` env var (e.g. raise it back toward 1 once
 * the noisy sources are fixed, or lower it further during an incident).
 */
function cspReportSampleRate(): number {
  const raw = process.env.CSP_REPORT_SAMPLE_RATE;
  if (raw !== undefined) {
    const n = Number(raw);
    if (Number.isFinite(n) && n >= 0 && n <= 1) return n;
  }
  return process.env.NODE_ENV === 'production' ? 0.1 : 1;
}

export async function POST(request: Request): Promise<NextResponse> {
  const contentType = request.headers.get('content-type') ?? '';

  try {
    const raw = await request.text();

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

      // Bound the forwarded volume so this open endpoint can never exhaust the
      // Sentry quota again, independent of report content or abuse.
      if (Math.random() >= sampleRate) continue;

      const blockedUri = toStringOrUndefined(violation['blocked-uri'] ?? violation.blockedURL);

      Sentry.captureMessage('CSP violation', {
        level: 'warning',
        // Group by directive so a single noisy directive no longer escalates
        // one project-wide mega-issue.
        fingerprint: ['csp-violation', directive],
        tags: {
          csp_directive: directive,
          blocked_scheme: schemeOf(blockedUri),
          // Host of the blocked URI — lets Sentry's tag breakdown enumerate
          // exactly which third-party domains need allow-listing.
          blocked_host: hostOf(blockedUri),
        },
        extra: {
          blockedUri: violation['blocked-uri'] ?? violation.blockedURL,
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

function hostOf(uri: string | undefined): string | undefined {
  if (!uri) return undefined;
  try {
    return new URL(uri).host || undefined;
  } catch {
    // Non-URL blocked-uri values ("inline", "eval", "self") have no host.
    return undefined;
  }
}
