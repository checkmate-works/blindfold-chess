import type { Metadata } from 'next';
import { getMessages, getTranslations } from 'next-intl/server';
import { Inter } from 'next/font/google';
import { cookies, headers } from 'next/headers';

import { DevGeoPicker } from '@/app/_components/DevGeoPicker';
import { EnvironmentRibbon } from '@/app/_components/EnvironmentRibbon';
import { GoogleScripts } from '@/app/_components/GoogleScripts';
import { ADSENSE_PUBLISHER_ID, AUTHOR_NAME, GA_MEASUREMENT_ID, SITE_URL } from '@/config';
import { generateThemeCSS } from '@blindfold-chess/ui';

import { getLocaleFromRequest } from '@/lib/locale';
import { JsonLd, generateOrganizationSchema, generateWebSiteSchema } from '@/lib/seo/jsonld';
import { StorageAvailabilityProvider } from '@/lib/storage/StorageAvailabilityProvider';
import { ThemeScript } from '@/lib/theme';

import { getLatestBannerAnnouncement } from '@/app/[locale]/(public)/announcements/_lib/queries';
import { AnnouncementBanner } from '@/app/[locale]/_components/AnnouncementBanner';
import { isServerOnlyNamespace } from '@/app/[locale]/_lib/i18n-namespaces';

import '../globals.css';
import { Providers } from './_lib/providers';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

/**
 * Lang-invariant metadata only. Title, description, canonical, hreflang,
 * Open Graph URL/locale, and Twitter card all depend on the `?lang=` query
 * param and therefore live in `page.tsx`'s `generateMetadata` — layouts do
 * not receive `searchParams` in Next.js App Router, so they cannot resolve
 * the landing locale. Anything lang-invariant (authors, metadataBase)
 * stays here and is inherited by the page.
 */
export function generateMetadata(): Metadata {
  return {
    authors: [{ name: AUTHOR_NAME }],
    metadataBase: new URL(SITE_URL),
  };
}

export default async function LandingLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocaleFromRequest();
  const [t, cookieStore, bannerAnnouncement, requestHeaders] = await Promise.all([
    getTranslations({ locale, namespace: 'metadata' }),
    cookies(),
    getLatestBannerAnnouncement(locale),
    headers(),
  ]);
  // Per-request CSP nonce (set by src/proxy.ts). Forwarded to every inline
  // <script> / <style> this layout emits so the enforcing `script-src` policy
  // lets them execute.
  const nonce = requestHeaders.get('x-nonce') ?? undefined;

  // Load the full client-side message dictionary so that Client Components
  // rendered below (e.g. the rank teaser cards via `RanksSection` →
  // `RankCard`) can resolve translations through `NextIntlClientProvider`.
  // Mirrors the filtering done in `[locale]/layout.tsx` so server-only
  // namespaces are excluded from the client payload.
  let allMessages: Awaited<ReturnType<typeof getMessages>>;
  try {
    allMessages = await getMessages({ locale });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[landing/layout] getMessages failed, using empty messages:', error);
    }
    allMessages = {};
  }
  const messages = Object.fromEntries(
    Object.entries(allMessages as Record<string, unknown>).filter(
      ([key]) => !isServerOnlyNamespace(key)
    )
  );

  const dismissedId = cookieStore.get('dismissed-announcement')?.value;
  const showBanner = bannerAnnouncement && bannerAnnouncement.id !== dismissedId;

  return (
    <html lang={locale} data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <ThemeScript />
        <JsonLd data={generateWebSiteSchema(locale, t('siteName'))} nonce={nonce} />
        <JsonLd data={generateOrganizationSchema()} nonce={nonce} />
        <style
          nonce={nonce}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: generateThemeCSS() }}
        />
      </head>
      <body className={`${inter.variable} font-sans antialiased bg-background text-foreground`}>
        <EnvironmentRibbon />
        <DevGeoPicker />
        {showBanner && (
          <AnnouncementBanner
            id={bannerAnnouncement.id}
            title={bannerAnnouncement.title}
            href={`/${locale}/announcements/${bannerAnnouncement.slug}`}
          />
        )}
        <StorageAvailabilityProvider>
          <GoogleScripts
            adsensePublisherId={ADSENSE_PUBLISHER_ID}
            gaMeasurementId={GA_MEASUREMENT_ID}
          />
          <Providers locale={locale} messages={messages}>
            {children}
          </Providers>
        </StorageAvailabilityProvider>
      </body>
    </html>
  );
}
