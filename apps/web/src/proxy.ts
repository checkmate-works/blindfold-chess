import { type NextRequest, NextResponse } from 'next/server';

import { needsLocalePrefix } from '@/i18n/locale-path';
import { negotiateLocale } from '@/i18n/negotiate-locale';
import * as Sentry from '@sentry/nextjs';

import { refreshAdsHiddenCookieOnResponse } from '@/lib/ads/ads-hidden-cookie-writer';
import { resolveReturnPath, returnTargetFor, withReturnPath } from '@/lib/auth-return-path';
import { embedLangNeedsCollapse, isCdnCacheableEmbedRequest } from '@/lib/games/embed-cdn-cache';
import {
  type ScriptPolicy,
  buildCspHeader,
  buildReportToHeader,
  buildReportingEndpointsHeader,
  generateCspNonce,
} from '@/lib/security/csp';
import { isFramablePath } from '@/lib/security/framing';
import { isStaticContentPath } from '@/lib/security/static-content-paths';
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
 * The `script-src` variant for a request.
 *
 * A per-request nonce only works when the HTML is rendered for that request:
 * Next copies the nonce from this header into the scripts it emits, so HTML
 * that is shared between requests would carry some earlier request's nonce
 * under this one's header. Two kinds of response are shared and get the
 * static-content variant instead:
 *
 * - prerendered (SSG/ISR) content routes — see
 *   `@/lib/security/static-content-paths` and the module doc in
 *   `@/lib/security/csp`;
 * - embeds stored by the CDN — see `@/lib/games/embed-cdn-cache`. The header
 *   is still stamped per request (the proxy runs ahead of the CDN), but it is
 *   request-invariant, so a stored body always matches it.
 */
function scriptPolicyFor(request: NextRequest): ScriptPolicy {
  const { pathname, searchParams } = request.nextUrl;
  return isStaticContentPath(pathname) || isCdnCacheableEmbedRequest(pathname, searchParams)
    ? { mode: 'static-content' }
    : { mode: 'per-request-nonce', nonce: generateCspNonce() };
}

/**
 * Apply CSP + reporting endpoint headers to a response, given its
 * `script-src` variant (see {@link scriptPolicyFor}) and path.
 *
 * The path decides `frame-ancestors`: the embed surface is meant to be put in
 * someone else's `<iframe>`, everything else must not be. See
 * `@/lib/security/framing`, which the static `X-Frame-Options` rule in
 * `next.config.ts` mirrors.
 *
 * Extracted into a helper so every `return` branch below can stamp the
 * headers consistently. The CSP is currently emitted as `Report-Only` — the
 * browser does NOT block violations, but POSTs them to `/api/csp-report` via
 * the `report-to` / `report-uri` directives for observability. The plan is to
 * flip to enforcing (`Content-Security-Policy`) once we have a preview/staging
 * environment where the real-browser surface (Stockfish / Maia web workers,
 * Google Analytics) can be verified.
 * Tracking: GitHub issue #89.
 *
 * Both `Reporting-Endpoints` (the modern Structured-Fields header) and
 * `Report-To` (its deprecated JSON predecessor) are emitted concurrently so
 * supporting browsers use the former while older ones keep working.
 */
function applyCspHeaders(
  response: NextResponse,
  scriptPolicy: ScriptPolicy,
  pathname: string
): NextResponse {
  response.headers.set(
    'Content-Security-Policy-Report-Only',
    buildCspHeader(scriptPolicy, { allowFraming: isFramablePath(pathname) })
  );
  response.headers.set('Reporting-Endpoints', buildReportingEndpointsHeader());
  response.headers.set('Report-To', buildReportToHeader());
  return response;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isBlockedPath(pathname)) {
    return NextResponse.json(null, { status: 404 });
  }

  // Complete a missing locale prefix (`/games/new` -> `/ja/games/new`) before
  // anything else touches the request. See `needsLocalePrefix()` for what is
  // and is not redirected, and why this is not next-intl's middleware.
  //
  // Runs ahead of `updateSession()` so a redirect costs no auth round-trip,
  // and carries no CSP headers on purpose — the response has no body to apply
  // a script policy to.
  //
  // 307, not 301: the destination depends on `Accept-Language`, so a shared
  // cache must not pin one language's answer for every visitor. `Vary` says
  // the same thing to anything that caches despite the 307.
  if (needsLocalePrefix(pathname)) {
    const locale = negotiateLocale(request.headers.get('accept-language'));
    const localizedUrl = request.nextUrl.clone();
    localizedUrl.pathname = `/${locale}${pathname}`;
    const redirect = NextResponse.redirect(localizedUrl, 307);
    redirect.headers.set('Vary', 'Accept-Language');
    return redirect;
  }

  // One `lang` per embed URL, before anything renders or is cached — see
  // `embedLangNeedsCollapse()`. The first value is kept because that is the
  // one the embed itself honours, so the redirect never changes what the
  // reader would have seen. No CSP headers, as with the redirect above.
  const firstLang = request.nextUrl.searchParams.get('lang');
  if (firstLang !== null && embedLangNeedsCollapse(pathname, request.nextUrl.searchParams)) {
    const collapsedUrl = request.nextUrl.clone();
    collapsedUrl.searchParams.set('lang', firstLang);
    return NextResponse.redirect(collapsedUrl, 307);
  }

  // On dynamic routes this carries a per-request nonce, which Next.js
  // extracts from the `Content-Security-Policy(-Report-Only)` header (set in
  // `applyCspHeaders` below) and stamps on the scripts it emits during a
  // dynamic render — no Server Component reads it. The app's own inline
  // bootstrap scripts are allowed by `'sha256-...'` hash sources instead (see
  // `@/lib/security/inline-script-hashes`), precisely so that no layout needs
  // a `headers()` call that would force dynamic rendering.
  const scriptPolicy = scriptPolicyFor(request);
  const requestHeaders = new Headers(request.headers);
  // Expose the request pathname to Server Components via `headers()`. Layouts
  // use it to pick a route-appropriate Suspense fallback (loading skeleton),
  // which a layout cannot otherwise derive (layouts only receive their own
  // segment's params, not the active child path).
  requestHeaders.set('x-pathname', pathname);
  // Likewise the query string. Layouts receive neither `searchParams` nor the
  // URL, and the embed layout needs `?lang` / `?bg` to emit the right
  // `<html lang>` and theme class in the SSR'd markup — the theme has to be on
  // the element before first paint, so resolving it in the page below is too
  // late. Includes the leading `?`, or is empty when there is no query.
  requestHeaders.set('x-search', request.nextUrl.search);

  // The embed surface never refreshes the session. It reads no cookie and
  // renders nothing per user, so the refresh would only cost a claims check
  // per iframe load — and it can answer with `Set-Cookie`, which must never
  // ride on a response the CDN stores for every reader of that URL.
  if (isFramablePath(pathname)) {
    return applyCspHeaders(
      NextResponse.next({ request: { headers: requestHeaders } }),
      scriptPolicy,
      pathname
    );
  }

  const { response, authenticated, userId } = await updateSession(request, { requestHeaders });

  // Return 404 for unauthenticated admin access to hide admin panel existence
  if (isAdminPath(pathname) && !authenticated) {
    return applyCspHeaders(new NextResponse(null, { status: 404 }), scriptPolicy, pathname);
  }

  // Redirect unauthenticated users away from auth-required pages, remembering
  // where they were headed so signing in resumes it. This guard runs ahead of
  // the equivalent ones in `(protected)/layout.tsx` and `getAuthenticatedUser`,
  // so for `/mypage/*` it is the only one that actually fires.
  if (isAuthRequiredPath(pathname) && !authenticated) {
    const locale = pathname.split('/')[1] || 'en';
    const signInUrl = new URL(
      withReturnPath(`/${locale}/sign-in`, returnTargetFor(pathname, request.nextUrl.search)),
      request.url
    );
    return applyCspHeaders(NextResponse.redirect(signInUrl), scriptPolicy, pathname);
  }

  // Redirect authenticated users away from the sign-in page — to their return
  // target when they carry one (a second tab signed in while this one sat on
  // `/sign-in?next=…`), otherwise to mypage. Without the `next` branch this
  // redirect would swallow the return target before the page ever renders,
  // which is what made `sign-in/page.tsx`'s own `next` handling unreachable.
  if (isSignInPath(pathname) && authenticated) {
    const locale = pathname.split('/')[1] || 'en';
    // `resolveReturnPath` rejects `/sign-in` itself, so this cannot loop.
    const next = resolveReturnPath(request.nextUrl.searchParams.get('next'));
    const destination = new URL(next ?? `/${locale}/mypage?toast=already_logged_in`, request.url);
    return applyCspHeaders(NextResponse.redirect(destination), scriptPolicy, pathname);
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

  return applyCspHeaders(response, scriptPolicy, pathname);
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
