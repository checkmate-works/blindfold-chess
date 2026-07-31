import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  buildCspHeader,
  buildReportToHeader,
  buildReportingEndpointsHeader,
  generateCspNonce,
} from './csp';
import {
  AD_HIDE_BOOTSTRAP_HASH,
  ANNOUNCEMENT_DISMISS_HASH,
  THEME_BOOTSTRAP_HASH_DEV,
  THEME_BOOTSTRAP_HASH_PROD,
} from './inline-script-hashes';

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
    const header = buildCspHeader(
      { mode: 'per-request-nonce', nonce: 'abc123' },
      { isDevelopment: false }
    );

    expect(header).toContain("'nonce-abc123'");
    expect(header).toContain("'strict-dynamic'");
    // No blanket inline escape hatch — that would neuter the XSS mitigation.
    expect(header).not.toContain("'unsafe-inline' 'nonce");
    expect(header).not.toContain("script-src 'self' 'unsafe-inline'");
  });

  it('embeds the hash sources for the constant inline bootstrap scripts (prod set)', () => {
    // The theme / ad-hide / announcement-dismiss bootstrap scripts carry no
    // nonce (a `headers()` read to fetch one would force dynamic rendering),
    // so the nonce policy must allow them by hash or every page view logs
    // three script-src violations.
    const header = buildCspHeader(
      { mode: 'per-request-nonce', nonce: 'abc' },
      { isDevelopment: false }
    );
    expect(header).toContain(`'${THEME_BOOTSTRAP_HASH_PROD}'`);
    expect(header).toContain(`'${AD_HIDE_BOOTSTRAP_HASH}'`);
    expect(header).toContain(`'${ANNOUNCEMENT_DISMISS_HASH}'`);
    expect(header).not.toContain(`'${THEME_BOOTSTRAP_HASH_DEV}'`);
  });

  it('swaps in the dev theme-script hash in development', () => {
    // Development renders the console-filter-prefixed theme script, whose
    // bytes (and therefore hash) differ from the production variant.
    const header = buildCspHeader(
      { mode: 'per-request-nonce', nonce: 'abc' },
      { isDevelopment: true }
    );
    expect(header).toContain(`'${THEME_BOOTSTRAP_HASH_DEV}'`);
    expect(header).not.toContain(`'${THEME_BOOTSTRAP_HASH_PROD}'`);
  });

  it('omits unsafe-eval in production', () => {
    const header = buildCspHeader(
      { mode: 'per-request-nonce', nonce: 'xyz' },
      { isDevelopment: false }
    );
    expect(header).not.toContain("'unsafe-eval'");
  });

  it("keeps 'wasm-unsafe-eval' in production for Stockfish WebAssembly", () => {
    // Stockfish (public/stockfish.js + stockfish.wasm) powers the AI game on
    // /[locale]/games/play and calls WebAssembly.instantiate. Without this
    // directive the Worker throws CompileError in production and the AI-game
    // UI hangs on "thinking...". Unlike 'unsafe-eval', this keyword does NOT
    // re-enable eval() for ordinary JS, so the XSS defence is unchanged.
    const header = buildCspHeader(
      { mode: 'per-request-nonce', nonce: 'xyz' },
      { isDevelopment: false }
    );
    expect(header).toContain("'wasm-unsafe-eval'");
  });

  it('permits unsafe-eval in development (Fast Refresh / Turbopack HMR)', () => {
    const header = buildCspHeader(
      { mode: 'per-request-nonce', nonce: 'xyz' },
      { isDevelopment: true }
    );
    expect(header).toContain("'unsafe-eval'");
  });

  it('retains the existing img / connect / frame allow-lists', () => {
    const header = buildCspHeader(
      { mode: 'per-request-nonce', nonce: 'n' },
      { isDevelopment: false }
    );

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

  it('allows blob: workers so the client-side HEIC converter (heic-to) can run', () => {
    const header = buildCspHeader(
      { mode: 'per-request-nonce', nonce: 'n' },
      { isDevelopment: false }
    );
    expect(header).toContain("worker-src 'self' blob:");
  });

  it('allow-lists the confirmed third-party hosts (Google Fonts)', () => {
    const header = buildCspHeader(
      { mode: 'per-request-nonce', nonce: 'n' },
      { isDevelopment: false }
    );

    const fontSrc = header.split('; ').find((d) => d.startsWith('font-src '));
    expect(fontSrc).toContain('fonts.gstatic.com');

    const styleSrc = header.split('; ').find((d) => d.startsWith('style-src '));
    expect(styleSrc).toContain('fonts.googleapis.com');
  });

  it('allow-lists AdSense Ad Traffic Quality beacon host in connect-src (ep1)', () => {
    // AdSense's Ad Traffic Quality system fetches https://ep1.adtrafficquality.google
    // — the connect-src counterpart of the ep2 frame host. Missing it floods
    // production with connect-src violations.
    const header = buildCspHeader(
      { mode: 'per-request-nonce', nonce: 'n' },
      { isDevelopment: false }
    );
    const connectSrc = header.split('; ').find((d) => d.startsWith('connect-src '));
    expect(connectSrc).toContain('ep1.adtrafficquality.google');
  });

  it('allow-lists the Ad Traffic Quality pixel host in img-src (ep1)', () => {
    // ep1.adtrafficquality.google is fetched as an <img> pixel as well as an
    // XHR beacon, so connect-src alone is not enough.
    const header = buildCspHeader(
      { mode: 'per-request-nonce', nonce: 'n' },
      { isDevelopment: false }
    );
    const imgSrc = header.split('; ').find((d) => d.startsWith('img-src '));
    expect(imgSrc).toContain('ep1.adtrafficquality.google');
  });

  it('allow-lists the Funding Choices CMP host in connect-src', () => {
    // Google's Privacy & messaging consent UI is delivered by adsbygoogle.js and
    // beacons fundingchoicesmessages.google.com over XHR. `'strict-dynamic'`
    // covers the injected script but not connect-src, so the host must be named.
    const header = buildCspHeader(
      { mode: 'per-request-nonce', nonce: 'n' },
      { isDevelopment: false }
    );
    const connectSrc = header.split('; ').find((d) => d.startsWith('connect-src '));
    expect(connectSrc).toContain('fundingchoicesmessages.google.com');
  });

  it('allow-lists the AdSense iframe host in frame-src (pagead2)', () => {
    // Some AdSense ad iframes are served from pagead2.googlesyndication.com.
    const header = buildCspHeader(
      { mode: 'per-request-nonce', nonce: 'n' },
      { isDevelopment: false }
    );
    const frameSrc = header.split('; ').find((d) => d.startsWith('frame-src '));
    expect(frameSrc).toContain('pagead2.googlesyndication.com');
    // Sanity: the existing ep2 iframe host is still present.
    expect(frameSrc).toContain('ep2.adtrafficquality.google');
  });

  it("allows framing our own origin, which the share dialog's embed preview needs", () => {
    // `frame-src` does not fall back to `default-src 'self'` once the
    // directive exists, so omitting this makes the preview a blank box the
    // moment the policy is enforced — and the preview is the only thing
    // telling a blogger what they are about to publish.
    const header = buildCspHeader(
      { mode: 'per-request-nonce', nonce: 'n' },
      { isDevelopment: false }
    );
    const frameSrc = header.split('; ').find((d) => d.startsWith('frame-src '));
    expect(frameSrc).toContain("'self'");
  });

  it('emits a manifest-src allowing self and the canonical site origin', () => {
    // metadataBase resolves /manifest.webmanifest to an absolute canonical URL.
    // When the document is served on a non-canonical host that URL is
    // cross-origin and the default-src 'self' fallback blocks it.
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://www.blindfold-chess.online');
    const header = buildCspHeader(
      { mode: 'per-request-nonce', nonce: 'n' },
      { isDevelopment: false }
    );
    const manifestSrc = header.split('; ').find((d) => d.startsWith('manifest-src '));
    expect(manifestSrc).toBeDefined();
    expect(manifestSrc).toContain("'self'");
    expect(manifestSrc).toContain('https://www.blindfold-chess.online');
    vi.unstubAllEnvs();
  });

  it('falls back to the production canonical origin in manifest-src when NEXT_PUBLIC_SITE_URL is unset', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', '');
    const header = buildCspHeader(
      { mode: 'per-request-nonce', nonce: 'n' },
      { isDevelopment: false }
    );
    const manifestSrc = header.split('; ').find((d) => d.startsWith('manifest-src '));
    expect(manifestSrc).toContain('https://www.blindfold-chess.online');
    vi.unstubAllEnvs();
  });

  it('points both report-to and report-uri at the collector', () => {
    const header = buildCspHeader(
      { mode: 'per-request-nonce', nonce: 'n' },
      { isDevelopment: false }
    );
    expect(header).toContain('report-uri /api/csp-report');
    expect(header).toContain('report-to csp-endpoint');
  });

  it("forbids framing by default — allowFraming must be asked for, and 'none' is what an omitted option means", () => {
    expect(
      buildCspHeader({ mode: 'per-request-nonce', nonce: 'n' }, { isDevelopment: false })
    ).toContain("frame-ancestors 'none'");
    expect(
      buildCspHeader(
        { mode: 'per-request-nonce', nonce: 'n' },
        { isDevelopment: false, allowFraming: false }
      )
    ).toContain("frame-ancestors 'none'");
  });

  it('opens frame-ancestors for the embed surface', () => {
    const header = buildCspHeader(
      { mode: 'per-request-nonce', nonce: 'n' },
      { isDevelopment: false, allowFraming: true }
    );
    const frameAncestors = header.split('; ').find((d) => d.startsWith('frame-ancestors'));
    expect(frameAncestors).toBe('frame-ancestors *');
  });
});

describe('buildCspHeader — static-content variant', () => {
  const header = () => buildCspHeader({ mode: 'static-content' }, { isDevelopment: false });

  it('has no nonce, no strict-dynamic, and no hash sources', () => {
    // Prerendered HTML is shared across requests: it can never carry a
    // per-request nonce, and any nonce/hash present in script-src would make
    // browsers ignore 'unsafe-inline' (CSP2), re-blocking the framework's
    // inline flight scripts baked into the cached HTML.
    const scriptSrc = header()
      .split('; ')
      .find((d) => d.startsWith('script-src '));
    expect(scriptSrc).toBeDefined();
    expect(scriptSrc).not.toContain("'nonce-");
    expect(scriptSrc).not.toContain("'strict-dynamic'");
    expect(scriptSrc).not.toContain("'sha256-");
  });

  it("falls back to 'unsafe-inline' so cached framework inline scripts run", () => {
    const scriptSrc = header()
      .split('; ')
      .find((d) => d.startsWith('script-src '));
    expect(scriptSrc).toContain("'unsafe-inline'");
  });

  it('keeps every non-script directive identical to the nonce variant', () => {
    const nonceHeader = buildCspHeader(
      { mode: 'per-request-nonce', nonce: 'n' },
      { isDevelopment: false }
    );
    const strip = (h: string) => h.split('; ').filter((d) => !d.startsWith('script-src '));
    expect(strip(header())).toEqual(strip(nonceHeader));
  });
});

describe('buildCspHeader — Supabase origin from env', () => {
  beforeEach(() => {
    // Start each test with the env var unset so individual cases can stub it
    // explicitly; otherwise a real `.env.local` value would leak in.
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('includes the Supabase origin from NEXT_PUBLIC_SUPABASE_URL in connect-src', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://127.0.0.1:54321');
    const header = buildCspHeader(
      { mode: 'per-request-nonce', nonce: 'n' },
      { isDevelopment: false }
    );

    const connectSrc = header.split('; ').find((d) => d.startsWith('connect-src '));
    expect(connectSrc).toBeDefined();
    expect(connectSrc).toContain('http://127.0.0.1:54321');
  });

  it('includes the corresponding WebSocket origin in connect-src', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://127.0.0.1:54321');
    const header = buildCspHeader(
      { mode: 'per-request-nonce', nonce: 'n' },
      { isDevelopment: false }
    );

    const connectSrc = header.split('; ').find((d) => d.startsWith('connect-src '));
    expect(connectSrc).toBeDefined();
    expect(connectSrc).toContain('ws://127.0.0.1:54321');
  });

  it('includes the Supabase origin in img-src', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://127.0.0.1:54321');
    const header = buildCspHeader(
      { mode: 'per-request-nonce', nonce: 'n' },
      { isDevelopment: false }
    );

    const imgSrc = header.split('; ').find((d) => d.startsWith('img-src '));
    expect(imgSrc).toBeDefined();
    expect(imgSrc).toContain('http://127.0.0.1:54321');
  });

  it('uses wss:// when Supabase URL is https://', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://abc.supabase.co');
    const header = buildCspHeader(
      { mode: 'per-request-nonce', nonce: 'n' },
      { isDevelopment: false }
    );

    const connectSrc = header.split('; ').find((d) => d.startsWith('connect-src '));
    expect(connectSrc).toBeDefined();
    expect(connectSrc).toContain('wss://abc.supabase.co');
    // Sanity: no http downgrade.
    expect(connectSrc).not.toContain('ws://abc.supabase.co');
  });

  it('does not break when NEXT_PUBLIC_SUPABASE_URL is missing', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
    expect(() =>
      buildCspHeader({ mode: 'per-request-nonce', nonce: 'n' }, { isDevelopment: false })
    ).not.toThrow();

    const header = buildCspHeader(
      { mode: 'per-request-nonce', nonce: 'n' },
      { isDevelopment: false }
    );
    const connectSrc = header.split('; ').find((d) => d.startsWith('connect-src '));
    expect(connectSrc).toBeDefined();
    // Wildcard fallback remains so production keeps working.
    expect(connectSrc).toContain('*.supabase.co');
  });

  it('does not break when NEXT_PUBLIC_SUPABASE_URL is malformed', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'not a url');
    expect(() =>
      buildCspHeader({ mode: 'per-request-nonce', nonce: 'n' }, { isDevelopment: false })
    ).not.toThrow();

    const header = buildCspHeader(
      { mode: 'per-request-nonce', nonce: 'n' },
      { isDevelopment: false }
    );
    const connectSrc = header.split('; ').find((d) => d.startsWith('connect-src '));
    expect(connectSrc).toBeDefined();
    expect(connectSrc).toContain('*.supabase.co');
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
    const csp = buildCspHeader({ mode: 'per-request-nonce', nonce: 'n' }, { isDevelopment: false });
    const reporting = buildReportingEndpointsHeader();
    expect(csp).toContain('report-to csp-endpoint');
    expect(reporting.startsWith('csp-endpoint=')).toBe(true);
  });
});
