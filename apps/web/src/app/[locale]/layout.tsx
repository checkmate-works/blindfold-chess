import type { Metadata } from 'next';
import { hasLocale } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { Inter } from 'next/font/google';
import { notFound } from 'next/navigation';

import { DevGeoPicker } from '@/app/_components/DevGeoPicker';
import { GoogleScripts } from '@/app/_components/GoogleScripts';
import { ADSENSE_PUBLISHER_ID, AUTHOR_NAME, GA_MEASUREMENT_ID, SITE_URL } from '@/config';
import { OG_LOCALE_MAP } from '@/i18n/og-locale';
import { routing } from '@/i18n/routing';
import { generateThemeCSS } from '@blindfold-chess/ui';
import { EnvironmentRibbon } from 'env-ribbon';

import { AdHideBootstrapScript } from '@/lib/ads/AdHideBootstrapScript';
import { JsonLd, generateOrganizationSchema, generateWebSiteSchema } from '@/lib/seo/jsonld';
import { StorageAvailabilityProvider } from '@/lib/storage/StorageAvailabilityProvider';
import { ThemeScript } from '@/lib/theme';

import '../globals.css';
import { Footer } from './_components/Footer';
import { Header } from './_components/Header';
import { MobileTabBar } from './_components/MobileTabBar';
import { isServerOnlyNamespace } from './_lib/i18n-namespaces';
import { buildPageTitle } from './_lib/metadata';
import { Providers } from './_lib/providers';
import { generateLocaleStaticParams } from './_lib/static-params';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

/**
 * Enumerate the supported `[locale]` segments at build time.
 *
 * Combined with `dynamicParams = false` below, this makes Next.js return a
 * framework-level 404 for any URL whose `[locale]` is not in
 * `SUPPORTED_LOCALES` — before `generateMetadata` is invoked and before any
 * nested segment's own `generateStaticParams` / `dynamicParams` runs. This
 * prevents stray URLs (e.g. bare `/pt/...` or `/fr/...`) from throwing
 * 500-level errors inside metadata generation.
 *
 * Nested dynamic segments (e.g. `[locale]/articles/[slug]`) are unaffected —
 * `dynamicParams` is scoped to the segment it is declared on, so their DB-
 * / on-demand-driven params continue to resolve per their own declarations.
 * Note: `[locale]/glossary/letter/[letter]` declares its own
 * `dynamicParams = false` to stop bots from filling the on-demand ISR cache
 * with non-Latin letter URLs that always resolve to empty results.
 */
export const generateStaticParams = generateLocaleStaticParams;

/**
 * Return 404 for any `[locale]` value outside the set returned by
 * `generateStaticParams` above. Only scopes to this segment's params —
 * nested dynamic segments keep their default `dynamicParams = true`.
 */
export const dynamicParams = false;

/**
 * Default ISR interval for every static route in this tree (pages may set a
 * lower one; dynamic routes ignore it). Bounds the staleness of layout-level
 * content baked into prerendered HTML — most visibly the announcement banner
 * the Header renders — to one hour, instead of the build default of one day.
 */
export const revalidate = 3600;

/**
 * Route segment config, inherited by every page below. The platform default
 * under Fluid Compute is 300s; nothing under `[locale]` legitimately renders
 * for a minute, so a hung render (see the navigation-stall entry in CLAUDE.md's
 * Known Issues) now dies visibly at 60s instead of silently burning five
 * minutes per hang.
 */
export const maxDuration = 60;

/**
 * Load the `metadata`-namespace translator, falling back to an identity
 * function (dev-warned) if next-intl fails to resolve messages. Shared by
 * `generateMetadata` and the default `Layout` export below, which both need it.
 *
 * The fallback only supports the `t(key)` call form used in this file —
 * `t.rich()`, `t.markup()`, etc. are NOT available on it.
 */
async function getMetadataTranslator(
  locale: string,
  context: string
): Promise<Awaited<ReturnType<typeof getTranslations<'metadata'>>>> {
  try {
    return await getTranslations({ locale, namespace: 'metadata' });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[${context}] getTranslations failed, using fallback:`, error);
    }
    return ((key: string) => key) as Awaited<ReturnType<typeof getTranslations<'metadata'>>>;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  // Narrow `locale` (typed as plain `string` from params) to a supported
  // `Locale` so exhaustive `Record<Locale, _>` maps (OG, SITE_NAMES) can be
  // indexed without a fallback. Unknown locales fall back to the default.
  const locale = hasLocale(routing.locales, rawLocale) ? rawLocale : routing.defaultLocale;

  const t = await getMetadataTranslator(locale, 'generateMetadata');

  const siteName = t('siteName');
  const seoSiteName = t('seoSiteName');
  const description = t('siteDescription');
  const currentLocale = OG_LOCALE_MAP[locale];
  const alternateLocales = Object.values(OG_LOCALE_MAP).filter((l) => l !== currentLocale);
  const ogTitle = buildPageTitle(seoSiteName, locale);

  return {
    title: {
      default: seoSiteName,
      template: `%s | ${seoSiteName}`,
    },
    description,
    authors: [{ name: AUTHOR_NAME }],
    metadataBase: new URL(SITE_URL),
    manifest: '/manifest.webmanifest',
    icons: {
      icon: [
        { url: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
        { url: '/icon-512x512.png', sizes: '512x512', type: 'image/png' },
      ],
      apple: [{ url: '/icon-192x192.png', sizes: '192x192', type: 'image/png' }],
    },
    openGraph: {
      title: ogTitle,
      description,
      siteName: siteName,
      type: 'website',
      locale: currentLocale,
      alternateLocale: alternateLocales,
      images: [
        {
          url: '/logo.png',
          width: 512,
          height: 512,
          alt: `${siteName} Logo`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: ogTitle,
      description,
      images: ['/logo.png'],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  };
}

export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;

  // Ensure that the incoming `locale` is valid. Narrow to `Locale` so every
  // downstream call that expects the `Locale` union (JSON-LD emitters, OG
  // metadata, etc.) can be fed `locale` directly without a second runtime
  // check or cast.
  if (!hasLocale(routing.locales, rawLocale)) {
    notFound();
  }
  const locale = rawLocale;

  // Seed next-intl's request-scoped locale for the entire tree below,
  // including contexts that receive no `params` of their own (`loading.tsx`
  // boundaries, `not-found.tsx`, Suspense skeleton fallbacks). Those
  // contexts read it back via `getLocale()` / bare `getTranslations()`.
  // Without this seed they would have to fall back to a `headers()` read
  // (the deleted `getLocaleFromPathnameHeader` helper), and any `headers()`
  // call inside a loading/not-found boundary taints the WHOLE route as
  // dynamic — the `[locale]/not-found.tsx` variant alone kept every route
  // in this tree out of static generation.
  setRequestLocale(locale);

  const t = await getMetadataTranslator(locale, 'layout');

  let allMessages: Awaited<ReturnType<typeof getMessages>>;
  try {
    allMessages = await getMessages({ locale });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[layout] getMessages failed, using empty messages:', error);
    }
    allMessages = {};
  }

  // Namespaces used only by Server Components (via getTranslations()) are
  // excluded from the client-side dictionary payload. The classification lives
  // in `./_lib/i18n-namespaces.ts` and is validated at check time by
  // `scripts/check-i18n-namespaces.ts` (run via `pnpm check:i18n`). Adding a
  // new namespace requires classifying it there or the check will fail.
  const messages = Object.fromEntries(
    Object.entries(allMessages as Record<string, unknown>).filter(
      ([key]) => !isServerOnlyNamespace(key)
    )
  );

  return (
    <html lang={locale} data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <ThemeScript />
        <JsonLd data={generateWebSiteSchema(locale, t('siteName'))} />
        <JsonLd data={generateOrganizationSchema()} />
        <style
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `${generateThemeCSS()}\n\n/* No-flash ad-hide — see [locale]/layout.tsx comment near the bootstrap script. */\nhtml[data-ads-hidden='true'] .ad-slot-wrapper,\nhtml[data-ads-hidden='true'] .adsbygoogle{display:none!important;}`,
          }}
        />
        {/*
          No-flash ad-hide bootstrap. Reads the `bfc_ads_hidden` cookie and,
          when set to `'1'`, flags `<html data-ads-hidden="true">`. The
          matching CSS rule lives in the inline <style> block directly above
          (not in `globals.css`) so it is render-blocking with <head> and
          applies before the first paint even on cold-cache loads — this
          prevents a brief flash of the ad slot before the external
          stylesheet arrives. Mirrors the AnnouncementBanner no-flash pattern
          (see Header.tsx) and keeps the page free of a server-side
          `cookies()` read so descendant pages can stay static/ISR.

          AdHideBootstrapScript is a Server Component, parallel to
          ThemeScript — the <script> must be in the SSR'd HTML to execute
          synchronously before first paint.
        */}
        <AdHideBootstrapScript />
      </head>
      <body className={`${inter.variable} font-sans antialiased bg-background text-foreground`}>
        <EnvironmentRibbon />
        <DevGeoPicker />
        <StorageAvailabilityProvider>
          <GoogleScripts
            adsensePublisherId={ADSENSE_PUBLISHER_ID}
            gaMeasurementId={GA_MEASUREMENT_ID}
          />
          <Providers locale={locale} messages={messages}>
            <div className="flex flex-col min-h-screen">
              <Header locale={locale} />
              <main className="flex-1 bg-secondary">
                {/* pb-0 at <sm: footer sits flush against page content on mobile; py-8 (= pt-8 + sm:pb-8) preserved at ≥sm. */}
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-0 sm:pb-8">
                  {children}
                </div>
              </main>
              <Footer locale={locale} />
              {/* Spacer to prevent the fixed MobileTabBar from covering the footer */}
              <div className="h-14 md:h-0" />
              <MobileTabBar />
            </div>
          </Providers>
        </StorageAvailabilityProvider>
      </body>
    </html>
  );
}
