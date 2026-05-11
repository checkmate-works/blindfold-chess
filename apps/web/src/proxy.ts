import { type NextRequest, NextResponse } from 'next/server';

import * as Sentry from '@sentry/nextjs';

import { refreshAdsHiddenCookieOnResponse } from '@/lib/ads/ads-hidden-cookie-writer';
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

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isBlockedPath(pathname)) {
    return NextResponse.json(null, { status: 404 });
  }

  const { response, authenticated, userId } = await updateSession(request);

  // Return 404 for unauthenticated admin access to hide admin panel existence
  if (isAdminPath(pathname) && !authenticated) {
    return new NextResponse(null, { status: 404 });
  }

  // Redirect unauthenticated users away from auth-required pages
  if (isAuthRequiredPath(pathname) && !authenticated) {
    const locale = pathname.split('/')[1] || 'en';
    const signInUrl = new URL(`/${locale}/sign-in`, request.url);
    return NextResponse.redirect(signInUrl);
  }

  // Redirect authenticated users away from the sign-in page
  if (isSignInPath(pathname) && authenticated) {
    const locale = pathname.split('/')[1] || 'en';
    const mypageUrl = new URL(`/${locale}/mypage?toast=already_logged_in`, request.url);
    return NextResponse.redirect(mypageUrl);
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

  return response;
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
    '/((?!_next/static|_next/image|api/|favicon\\.ico|sitemap\\.xml|robots\\.txt|icon\\.png|apple-icon\\.png|manifest\\.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|wasm|map)).*)',
  ],
};
