import { type NextRequest, NextResponse } from 'next/server';

import { buildCspHeader, buildReportToHeader, generateCspNonce } from '@/lib/security/csp';
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

/**
 * Apply CSP + Report-To headers to a response, given the request nonce.
 *
 * Extracted into a helper so every `return` branch below can stamp the
 * headers consistently. The CSP is enforcing (not Report-Only) — violations
 * block the offending resource AND are POSTed to `/api/csp-report` via the
 * `report-to` / `report-uri` directives for observability.
 */
function applyCspHeaders(response: NextResponse, nonce: string): NextResponse {
  response.headers.set('Content-Security-Policy', buildCspHeader(nonce));
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

  const { response, authenticated } = await updateSession(request, { requestHeaders });

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

  return applyCspHeaders(response, nonce);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     * - icon.png, apple-icon.png (icon files)
     * - manifest.webmanifest (PWA manifest)
     */
    '/((?!_next/static|_next/image|favicon\\.ico|sitemap\\.xml|robots\\.txt|icon\\.png|apple-icon\\.png|manifest\\.webmanifest).*)',
  ],
};
