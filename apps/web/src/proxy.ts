import { type NextRequest, NextResponse } from 'next/server';

import * as Sentry from '@sentry/nextjs';

import { refreshAdsHiddenCookieOnResponse } from '@/lib/ads/ads-hidden-cookie-writer';
import {
  buildCspHeader,
  buildReportToHeader,
  buildReportingEndpointsHeader,
  generateCspNonce,
} from '@/lib/security/csp';
import { updateSession } from '@/lib/supabase/proxy';

const BLOCKED_PATHS = [
  '/wp-admin',
  '/wp-login.php',
  '/wp-content',
  '/wp-includes',
  '/xmlrpc.php',
  '/wp-cron.php',
  '/.env',
  '/.git',
  '/phpinfo',
  '/phpmyadmin',
  '/administrator',
];

const AUTH_REQUIRED_PATHS = ['/mypage'];
const SIGN_IN_PATH = '/sign-in';
const ADMIN_PATH = '/admin';
// Path (after the locale segment) for which the proxy refreshes the
// `bfc_ads_hidden` cookie on the outgoing response. Kept narrow on purpose:
// ordinary authenticated page loads are already covered by `getSessionUser()`
// (called from `AuthProvider`), so we only need to handle the few entry
// points that DON'T go through the auth provider mount — chiefly the Stripe
// checkout `success_url` landing on `/mypage/subscription?status=success`,
// where the user's entitlement just changed and the cookie must reflect that
// before the page renders.
const ADS_COOKIE_REFRESH_PATH = '/mypage/subscription';

function isBlockedPath(pathname: string): boolean {
  return BLOCKED_PATHS.some(
    (blocked) => pathname === blocked || pathname.startsWith(blocked + '/')
  );
}

function isAuthRequiredPath(pathname: string): boolean {
  return AUTH_REQUIRED_PATHS.some((path) => {
    const pattern = new RegExp(`^/[^/]+${path}(/.*)?$`);
    return pattern.test(pathname);
  });
}

function isAdminPath(pathname: string): boolean {
  const lower = pathname.toLowerCase();
  return lower === ADMIN_PATH || lower.startsWith(ADMIN_PATH + '/');
}

function isSignInPath(pathname: string): boolean {
  const pattern = new RegExp(`^/[^/]+${SIGN_IN_PATH}(/.*)?$`);
  return pattern.test(pathname);
}

function isAdsCookieRefreshPath(pathname: string): boolean {
  const pattern = new RegExp(`^/[^/]+${ADS_COOKIE_REFRESH_PATH}(/.*)?$`);
  return pattern.test(pathname);
}

/**
 * Apply CSP + reporting endpoint headers to a response, given the request
 * nonce.
 *
 * Extracted into a helper so every `return` branch below can stamp the
 * headers consistently. The CSP is currently emitted as `Report-Only` — the
 * browser does NOT block violations, but POSTs them to `/api/csp-report` via
 * the `report-to` / `report-uri` directives for observability. The plan is to
 * flip to enforcing (`Content-Security-Policy`) once we have a preview/staging
 * environment where the real-browser surface (Stockfish / Maia web workers,
 * CookieYes CMP, Google Analytics, AdSense dynamic loads) can be verified.
 * Tracking: GitHub issue #89.
 *
 * Both `Reporting-Endpoints` (the modern Structured-Fields header) and
 * `Report-To` (its deprecated JSON predecessor) are emitted concurrently so
 * supporting browsers use the former while older ones keep working.
 */
function applyCspHeaders(response: NextResponse, nonce: string): NextResponse {
  response.headers.set('Content-Security-Policy-Report-Only', buildCspHeader(nonce));
  response.headers.set('Reporting-Endpoints', buildReportingEndpointsHeader());
  response.headers.set('Report-To', buildReportToHeader());
  return response;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isBlockedPath(pathname)) {
    return NextResponse.json(null, { status: 404 });
  }

  // Generate a per-request nonce and expose it to downstream Server
  // Components via an `x-nonce` request header. React Server Components read
  // it through `headers()` and attach it to their inline `<script>` tags.
  // Next.js itself also picks this up to nonce its own hydration chunks.
  const nonce = generateCspNonce();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);

  const { response, authenticated, userId } = await updateSession(request, { requestHeaders });

  // Return 404 for unauthenticated admin access to hide admin panel existence
  if (isAdminPath(pathname) && !authenticated) {
    return applyCspHeaders(new NextResponse(null, { status: 404 }), nonce);
  }

  // Redirect unauthenticated users away from auth-required pages
  if (isAuthRequiredPath(pathname) && !authenticated) {
    const locale = pathname.split('/')[1] || 'en';
    const signInUrl = new URL(`/${locale}/sign-in`, request.url);
    return applyCspHeaders(NextResponse.redirect(signInUrl), nonce);
  }

  // Redirect authenticated users away from the sign-in page
  if (isSignInPath(pathname) && authenticated) {
    const locale = pathname.split('/')[1] || 'en';
    const mypageUrl = new URL(`/${locale}/mypage?toast=already_logged_in`, request.url);
    return applyCspHeaders(NextResponse.redirect(mypageUrl), nonce);
  }

  // Refresh the `bfc_ads_hidden` cookie on the response when the user is
  // navigating to `/mypage/subscription` (and its Stripe-success landing).
  // Server Components cannot mutate cookies during render under Next.js 16,
  // so the previous in-page `refreshAdsHiddenCookie()` Server Action call
  // has been moved here. See `@/lib/ads/ads-hidden-cookie-writer.ts` for the
  // overall design rationale.
  //
  // A transient failure (DB blip, Supabase outage) is isolated so the page
  // still renders: the cookie is left at its previous value, which
  // self-corrects on the next visit. The error is reported to Sentry so the
  // regression is observable.
  if (isAdsCookieRefreshPath(pathname)) {
    try {
      await refreshAdsHiddenCookieOnResponse(response, userId);
    } catch (error) {
      Sentry.captureException(error);
    }
  }

  return applyCspHeaders(response, nonce);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - api/ (route handlers manage their own auth via @supabase/ssr,
     *   which refreshes tokens on demand; running the proxy for every
     *   /api/* call doubles up auth.getUser() and adds an Edge Middleware
     *   invocation per request)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     * - icon.png, apple-icon.png (icon files)
     * - manifest.webmanifest (PWA manifest)
     * - common static asset extensions served from `/public/` (e.g.
     *   /stockfish.wasm, og-image, svg). These bypass /_next/static so
     *   they need an explicit extension allowlist.
     */
    '/((?!_next/static|_next/image|api/|favicon\\.ico|sitemap\\.xml|robots\\.txt|icon\\.png|apple-icon\\.png|manifest\\.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|wasm|map|txt|onnx)).*)',
  ],
};
