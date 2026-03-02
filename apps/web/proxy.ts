import { type NextRequest, NextResponse } from 'next/server';

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

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isBlockedPath(pathname)) {
    return NextResponse.json(null, { status: 404 });
  }

  const { response, user } = await updateSession(request);

  // Return 404 for unauthenticated admin access to hide admin panel existence
  if (isAdminPath(pathname) && !user) {
    return new NextResponse(null, { status: 404 });
  }

  // Redirect unauthenticated users away from auth-required pages
  if (isAuthRequiredPath(pathname) && !user) {
    const locale = pathname.split('/')[1] || 'en';
    const signInUrl = new URL(`/${locale}/sign-in`, request.url);
    return NextResponse.redirect(signInUrl);
  }

  // Redirect authenticated users away from the sign-in page
  if (isSignInPath(pathname) && user) {
    const locale = pathname.split('/')[1] || 'en';
    const mypageUrl = new URL(`/${locale}/mypage?toast=already_logged_in`, request.url);
    return NextResponse.redirect(mypageUrl);
  }

  return response;
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
