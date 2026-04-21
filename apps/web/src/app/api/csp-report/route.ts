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
 * silently drop every report. Abuse is mitigated by:
 *   - `Sentry.captureMessage` being rate-limited by Sentry itself.
 *   - The handler not touching any database or user session.
 *
 * Always responds 204 (no body) regardless of parse success so the browser
 * does not retry or log failures.
 */
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

    const violations = extractViolations(parsed, contentType);

    for (const violation of violations) {
      Sentry.captureMessage('CSP violation', {
        level: 'warning',
        tags: {
          csp_directive: toStringOrUndefined(
            violation['effective-directive'] ??
              violation['violated-directive'] ??
              violation.effectiveDirective
          ),
          blocked_scheme: schemeOf(
            toStringOrUndefined(violation['blocked-uri'] ?? violation.blockedURL)
          ),
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
