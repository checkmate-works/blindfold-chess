import { describe, expect, it } from 'vitest';

import {
  buildCspHeader,
  buildReportToHeader,
  buildReportingEndpointsHeader,
  generateCspNonce,
} from './csp';

describe('generateCspNonce', () => {
  it('returns a base64-encoded 16-byte nonce', () => {
    const nonce = generateCspNonce();
    // 16 bytes base64-encoded is 24 characters including padding.
    expect(nonce).toMatch(/^[A-Za-z0-9+/]{22,24}={0,2}$/);
    expect(Buffer.from(nonce, 'base64').length).toBe(16);
  });

  it('produces a different value on every call', () => {
    const a = generateCspNonce();
    const b = generateCspNonce();
    expect(a).not.toBe(b);
  });
});

describe('buildCspHeader', () => {
  it('embeds the nonce and strict-dynamic in script-src', () => {
    const header = buildCspHeader('abc123', { isDevelopment: false });

    expect(header).toContain("'nonce-abc123'");
    expect(header).toContain("'strict-dynamic'");
    // No blanket inline escape hatch — that would neuter the XSS mitigation.
    expect(header).not.toContain("'unsafe-inline' 'nonce");
    expect(header).not.toContain("script-src 'self' 'unsafe-inline'");
  });

  it('omits unsafe-eval in production', () => {
    const header = buildCspHeader('xyz', { isDevelopment: false });
    expect(header).not.toContain("'unsafe-eval'");
  });

  it('permits unsafe-eval in development (Fast Refresh / Turbopack HMR)', () => {
    const header = buildCspHeader('xyz', { isDevelopment: true });
    expect(header).toContain("'unsafe-eval'");
  });

  it('retains the existing img / connect / frame allow-lists', () => {
    const header = buildCspHeader('n', { isDevelopment: false });

    expect(header).toContain('img-src');
    expect(header).toContain('*.supabase.co');
    expect(header).toContain('connect-src');
    expect(header).toContain('*.sentry.io');
    expect(header).toContain('frame-src');
    expect(header).toContain('googleads.g.doubleclick.net');
    expect(header).toContain("frame-ancestors 'none'");
    expect(header).toContain("object-src 'none'");
    expect(header).toContain("base-uri 'self'");
    expect(header).toContain("form-action 'self'");
  });

  it('points both report-to and report-uri at the collector', () => {
    const header = buildCspHeader('n', { isDevelopment: false });
    expect(header).toContain('report-uri /api/csp-report');
    expect(header).toContain('report-to csp-endpoint');
  });
});

describe('buildReportToHeader', () => {
  it('returns a JSON Report-To config pointing at /api/csp-report', () => {
    const raw = buildReportToHeader();
    const parsed = JSON.parse(raw);
    expect(parsed.group).toBe('csp-endpoint');
    expect(parsed.max_age).toBeGreaterThan(0);
    expect(parsed.endpoints).toEqual([{ url: '/api/csp-report' }]);
  });
});

describe('buildReportingEndpointsHeader', () => {
  it('returns a Structured-Fields header pointing at /api/csp-report', () => {
    const raw = buildReportingEndpointsHeader();
    // Shape: csp-endpoint="/api/csp-report" — key="value" pair, not JSON.
    expect(raw).toBe('csp-endpoint="/api/csp-report"');
    expect(() => JSON.parse(raw)).toThrow();
  });

  it('uses the same group name as the CSP report-to directive', () => {
    const csp = buildCspHeader('n', { isDevelopment: false });
    const reporting = buildReportingEndpointsHeader();
    expect(csp).toContain('report-to csp-endpoint');
    expect(reporting.startsWith('csp-endpoint=')).toBe(true);
  });
});
