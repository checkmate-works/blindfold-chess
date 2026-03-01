import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { SUPPORTED_LOCALES } from '@/config';

import { updateSession } from '@/lib/supabase/middleware';

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Extract the first segment (potential locale)
  const segments = pathname.split('/').filter(Boolean);
  const firstSegment = segments[0];

  // Check if the first segment exists
  if (firstSegment) {
    // Check if it's an invalid locale attempting to access the [locale] route
    const isInvalidLocale = !SUPPORTED_LOCALES.includes(
      firstSegment as (typeof SUPPORTED_LOCALES)[number]
    );

    // Return 404 for any path that starts with something other than valid locales
    // (excluding root path and auth callback)
    if (isInvalidLocale && pathname !== '/' && !pathname.startsWith('/auth/')) {
      return new NextResponse(null, { status: 404 });
    }
  }

  // Check if the pathname is missing a locale
  const pathnameIsMissingLocale = SUPPORTED_LOCALES.every(
    (locale) => !pathname.startsWith(`/${locale}/`) && pathname !== `/${locale}`
  );

  // Redirect if locale is missing (but not for landing page or auth routes)
  if (pathnameIsMissingLocale && pathname !== '/' && !pathname.startsWith('/auth/')) {
    // Get the preferred locale from Accept-Language header or default to 'en'
    const acceptLanguage = request.headers.get('accept-language');
    const preferredLocale = acceptLanguage?.includes('ja') ? 'ja' : 'en';

    // Redirect to the same pathname with locale prefix
    return NextResponse.redirect(new URL(`/${preferredLocale}${pathname}`, request.url));
  }

  // Refresh Supabase auth session
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Skip all internal paths (_next), API routes, static files, and images
    // Note: We need to process .xml files to return 404 for invalid ones like sitemap-0.xml
    '/((?!_next|api|images|favicon.ico|logo.png|apple-icon.png|icon.png|icon-192x192.png|icon-512x512.png|manifest.webmanifest|robots.txt|sitemap.xml|stockfish.js|stockfish.wasm|ads.txt|google9cbea86c89b56a83.html).*)',
  ],
};
