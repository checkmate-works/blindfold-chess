import { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

import { withSentryConfig } from '@sentry/nextjs';

const nextConfig: NextConfig = {
  // Enable React strict mode for better development experience
  reactStrictMode: true,

  // Optimize images from external sources
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [],
  },

  // Optimize production builds
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },

  // Enable experimental features for better performance
  experimental: {
    optimizeCss: true,
  },

  // Permanent redirects for renamed routes
  // TODO: Remove this redirect after ~3-6 months (added 2026-02-16).
  //       Once Google Search Console shows no traffic to /game/new, it is safe to remove.
  async redirects() {
    return [
      {
        source: '/:locale/game/new',
        destination: '/:locale/games/new',
        permanent: true,
      },
    ];
  },

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
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
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

  // Automatically annotate React components to show their full name in breadcrumbs and session replay
  reactComponentAnnotation: {
    enabled: true,
  },

  // Configure source maps
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN, // Only upload if auth token is present
  },

  // Automatically tree-shake Sentry logger statements to reduce bundle size
  disableLogger: true,
});
