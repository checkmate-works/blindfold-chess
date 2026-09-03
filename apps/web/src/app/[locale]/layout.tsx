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
import { isGlobalClientNamespace } from './_lib/i18n-scopes';
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
 * Default ISR interval for every static route in this tree (pages may set
 * their own; dynamic routes ignore it). Seven days, up from one day, which
 * was itself up from one hour (both steps 2026-08), because ISR Writes had
 * become the largest usage line on the bill after the subscription itself.
 *
 * What the interval sets is a ceiling, not a rate. An entry is rewritten only
 * when a request arrives after it went stale, so a page costs
 * `min(requests, 86400 / interval)` re-renders per day, each ~4 ISR Writes
 * under PPR. Measuring the 1h -> 24h step showed where the remaining spend
 * lives: daily cost fell by about a third (0.27 -> 0.17 USD-equivalent), and
 * the residual is request-bound — background traffic (crawler sweeps) touches
 * most of the static surface about once a day, so under a 24h ceiling each
 * touched page still rewrote daily. Production deploys turned out to be a
 * minor term: a zero-deploy day cost the same as a one-deploy day, roughly
 * 0.04/deploy at the margin. A 7-day ceiling cuts those once-a-day rewrites
 * to ~1/7; `false` would zero them but remove the backstop below entirely.
 *
 * This number alone does not set the ceiling. A route's effective revalidate
 * is the minimum of its segment config and every data-cache entry the render
 * touched, and `<Header>` below reads the banner announcement on every page
 * in this tree. So whatever `getLatestBannerAnnouncement` is cached for is
 * the real ceiling, and while that sat at a day this constant did nothing:
 * the 1h -> 24h step landed only because the banner query was raised from
 * 300s to a day in the same change, and the 24h -> 7d step, made here alone,
 * moved ISR Writes by 8% — inside the day-to-day noise. Read the build's
 * route table, not this line, to know what a page actually gets.
 * Daily numbers for both steps: GitHub issues #178 and #182.
 *
 * Freshness does not depend on this timer. Runtime content baked into
 * prerendered pages propagates through cache tags — admin announcement
 * mutations invalidate the `announcements` tag
 * (`admin/announcements/_lib/revalidate.ts`), articles and ad creatives have
 * their own — which marks every page that read the query stale, so each
 * re-renders on its next visit. The timer only backstops writes that bypass
 * those actions (a direct SQL / service-role write, a path we do not use);
 * such a write now takes up to seven days to surface on prerendered pages.
 */
export const revalidate = 604800;

/**
 * Route segment config, inherited by every page below. The platform default
 * under Fluid Compute is 300s; nothing under `[locale]` legitimately renders
 * for a minute, so a hung render now dies visibly at 60s instead of silently
 * burning five minutes per hang.
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

  // The root provider ships only the GLOBAL namespace set (~10 KB): the
  // always-mounted chrome plus the small pages that have no scoped subtree.
  // Heavy subtrees (practice, topics, games, ...) re-provide their own
  // dictionaries via nested providers — see `./_lib/i18n-scopes.ts` for the
  // registry and `scripts/check-i18n-scopes.ts` (run via `pnpm check:i18n`)
  // for the reachability guard that keeps both layers honest.
  const messages = Object.fromEntries(
    Object.entries(allMessages as Record<string, unknown>).filter(([key]) =>
      isGlobalClientNamespace(key)
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
