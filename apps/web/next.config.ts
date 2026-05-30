import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

import { withSentryConfig } from '@sentry/nextjs';

// NOTE: Content-Security-Policy is intentionally NOT defined here.
//
// Static headers declared via `next.config.ts#headers()` cannot carry a
// per-request value, but the enforcing CSP needs a `'nonce-<random>'`
// entry in `script-src` that is unique to each response. The CSP — together
// with its matching `Report-To` header — is built in `src/lib/security/csp.ts`
// and stamped onto every response by `src/proxy.ts`.
//
// All other security headers below (X-Frame-Options, X-Content-Type-Options,
// Permissions-Policy, Referrer-Policy, HSTS) are request-invariant and stay
// here so they also cover routes that bypass the proxy matcher (static
// assets, `_next/static/*`, etc.).

const nextConfig: NextConfig = {
  // Enable React strict mode for better development experience
  reactStrictMode: true,

  // Increase timeout for SSG pages with heavy DB queries (e.g., glossary category pages)
  staticPageGenerationTimeout: 120,

  // Optimize images from external sources (Supabase Storage avatars, etc.).
  //
  // `formats`, `deviceSizes`, and `imageSizes` are the three knobs that
  // multiply Vercel "Image Optimization Transformation" usage — every
  // (URL × format × size) tuple is billed once.
  //
  // - `formats: ['image/webp']`: drop AVIF. AVIF compresses ~20–30% better
  //   than WebP, but every served image becomes a separate transformation,
  //   so the variant cost outweighs the bandwidth win at our scale. WebP is
  //   universally supported by every browser this app cares about.
  // - `deviceSizes`: keep just the breakpoints we actually use. The default
  //   array has 8 entries (640–3840); 4K/QHD displays will accept the 1920
  //   variant with only a marginal blur on huge desktops, which is an
  //   acceptable trade for halving variants on responsive images.
  // - `imageSizes`: covers fixed-width thumbnails / logos / small icons.
  //   User avatars are pre-resized to 256×256 WebP at upload time and
  //   served `unoptimized`, so the avatar size buckets (24/32/48/64) are no
  //   longer needed in this list — only the remaining fixed-size images
  //   (Header 40px logo, hero 120px icons, etc.) drive this.
  images: {
    formats: ['image/webp'],
    deviceSizes: [640, 1024, 1920],
    imageSizes: [16, 32, 64, 128, 256],
    remotePatterns: (() => {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      if (!supabaseUrl) return [];
      const url = new URL(supabaseUrl);
      return [
        {
          protocol: url.protocol.replace(':', '') as 'http' | 'https',
          hostname: url.hostname,
          port: url.port,
          pathname: '/storage/v1/object/public/**',
        },
      ];
    })(),
  },

  // Optimize production builds
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },

  // Note: `experimental.optimizeCss` was removed on 2026-04-25.
  // It depends on `critters`, which is deprecated upstream (vercel/next.js#72036)
  // and does not support the App Router's streaming model
  // (vercel/next.js discussion #59989), so it has been a no-op on this codebase.
  // Removing it also eliminates the boot-time `Cannot resolve 'critters'`
  // ModuleBuildError under Turbopack. The official successor is
  // `experimental.inlineCss` — adopt deliberately if FCP gain on first-load
  // outweighs the loss of stylesheet caching for returning visitors.

  // Permanent redirects for renamed routes
  // TODO: Remove this redirect after ~3-6 months (added 2026-02-16).
  //       Once Google Search Console shows no traffic to /game/new, it is safe to remove.
  //
  // NOTE ON MISSING LOCALE MIDDLEWARE / REDIRECTS:
  // We intentionally do NOT globally redirect non-localized paths (e.g. `/learn` -> `/en/learn`)
  // because the Landing Page (app/(landing)/page.tsx) serves at the root `/` across
  // all languages without a `/[locale]` prefix. Forcing middleware redirects on `/`
  // would break this requirement.
  // As a result, old crawled URLs (like `/practice`) may show up as 404s in Google
  // Search Console. This is an accepted tradeoff.
  async redirects() {
    return [
      {
        source: '/:locale/game/new',
        destination: '/:locale/games/new',
        permanent: true,
      },
      {
        source: '/:locale/play',
        destination: '/:locale/games/play',
        permanent: true,
      },
      {
        source: '/:locale/play/result',
        destination: '/:locale/games/play/result',
        permanent: true,
      },
      {
        source: '/:locale/play/postmortem',
        destination: '/:locale/games/play/postmortem',
        permanent: true,
      },
      {
        source: '/:locale/play/error',
        destination: '/:locale/games/play/error',
        permanent: true,
      },
      // Redirect old /@/username URLs to /u/username.
      // Originally the URL scheme used /@/username, but @ is a reserved character
      // in Next.js App Router (it denotes parallel routes), which caused client-side
      // navigation to fail with route resolution errors (404). The scheme was migrated
      // to /u/username, and this redirect ensures old links and search engine entries
      // continue to work. (added 2026-04-09)
      {
        source: '/:locale/@/:username/:path*',
        destination: '/:locale/u/:username/:path*',
        permanent: true,
      },
      // Rank guide URL migration (added 2026-04-11).
      // Moved textbook-like guide content from /ranks/:slug/guide to the
      // independent /guides/ranks/:rank hub for namespace isolation and
      // future expansion (columns, tactics, etc.).
      // Safe to remove after 6 months if Search Console shows no traffic.
      {
        source: '/:locale/ranks/:slug/guide',
        destination: '/:locale/guides/ranks/:slug',
        permanent: true,
      },
      {
        source: '/:locale/ranks/:slug/guide/:page(\\d+)',
        destination: '/:locale/guides/ranks/:slug/:page',
        permanent: true,
      },
      // Coin page URL migration (added 2026-05-30).
      // The in-app currency is "Coin" everywhere user-facing, so the personal
      // wallet route moved from /mypage/points to /mypage/coins to match. The
      // page is auth-gated (low external-link risk), but keep this redirect so
      // bookmarks and previously-sent notification links still resolve.
      // Safe to remove after 6 months if Search Console shows no traffic.
      {
        source: '/:locale/mypage/points',
        destination: '/:locale/mypage/coins',
        permanent: true,
      },
    ];
  },

  // NOTE: The rewrites() block that mapped /@/username to /profile/username has been removed.
  // The URL scheme was changed from /@/username to /u/username because @ is a reserved
  // character in Next.js App Router (used for parallel routes), which caused client-side
  // navigation to fail with 404 errors. See the redirect rule above for the /@/ -> /u/ migration.

  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '0',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
      {
        // Stockfish WASM binary is content-hashed by filename (effectively immutable)
        // and only loaded on the VS AI game route. Cache aggressively so returning
        // players don't re-download the 6.9 MB binary on every session.
        source: '/stockfish.wasm',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // NOTE: Cache headers for the Maia ONNX model are set inside the
      // /api/engines/maia/[file] handler itself, not here. The model is
      // no longer a public static asset — it's served from a server-only
      // directory through an auth-gated route, and the response is marked
      // `Cache-Control: private, immutable` so the browser caches per-user
      // without polluting any shared CDN tier.
    ];
  },
  // The Maia ONNX model lives outside `public/` (in `engines/maia/`) so
  // that the only access path is the auth-gated route handler. Next.js
  // does not auto-trace files outside the source tree, so we have to tell
  // it explicitly to bundle the directory into the Vercel Function
  // artifact for the route handler. Without this, `readFile` would 404
  // at runtime even though the file exists at build time.
  outputFileTracingIncludes: {
    '/api/engines/maia/[file]': ['./engines/maia/**/*'],
  },
};

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

// Wrap with Sentry configuration
export default withSentryConfig(withNextIntl(nextConfig), {
  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options

  // Source maps are uploaded only if SENTRY_AUTH_TOKEN is set
  // org and project can be undefined if not uploading source maps
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Only print logs for uploading source maps in CI
  silent: true,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Sentry React component annotation, Turbopack edition.
  // Replaced the deprecated `reactComponentAnnotation` option on 2026-04-25:
  // the legacy option is webpack-only; under Turbopack it was a silent no-op.
  // `_experimental.turbopackReactComponentAnnotation` is the documented
  // Turbopack equivalent (Sentry Build Options reference).
  //
  // Note: `disableLogger` was also removed in the same change. Sentry's
  // tree-shaking options are not supported for Turbopack builds; the
  // option was a no-op on this stack. The bundle-size cost of leaving
  // debug logger statements in is small (they are runtime-gated on
  // `debug: false`, set in sentry.server.config.ts).
  _experimental: {
    turbopackReactComponentAnnotation: {
      enabled: true,
    },
  },

  // Configure source maps
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN, // Only upload if auth token is present
  },
});
