import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Check if the pathname is missing a locale
  const pathnameIsMissingLocale = ['en', 'ja'].every(
    (locale) => !pathname.startsWith(`/${locale}/`) && pathname !== `/${locale}`
  );

  // Redirect if locale is missing (but not for landing page or assets)
  if (
    pathnameIsMissingLocale &&
    pathname !== '/' &&
    !pathname.startsWith('/_next') &&
    !pathname.includes('.') &&
    !pathname.startsWith('/api')
  ) {
    // Get the preferred locale from Accept-Language header or default to 'en'
    const acceptLanguage = request.headers.get('accept-language');
    const preferredLocale = acceptLanguage?.includes('ja') ? 'ja' : 'en';

    // Redirect to the same pathname with locale prefix
    return NextResponse.redirect(new URL(`/${preferredLocale}${pathname}`, request.url));
  }
}

export const config = {
  matcher: [
    // Skip all internal paths (_next)
    '/((?!_next|api|favicon.ico|logo.png|apple-icon.png|icon.png|manifest.webmanifest).*)',
  ],
};
