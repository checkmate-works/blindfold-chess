import type { Metadata } from 'next';
import { getMessages, getTranslations } from 'next-intl/server';
import { Inter } from 'next/font/google';
import { cookies } from 'next/headers';

import { EnvironmentRibbon } from '@/app/_components/EnvironmentRibbon';
import { GoogleScripts } from '@/app/_components/GoogleScripts';
import {
  AUTHOR_NAME,
  COOKIEYES_ID,
  GA_MEASUREMENT_ID,
  SITE_URL,
  SUPPORTED_LOCALES,
} from '@/config';
import { OG_LOCALE_MAP } from '@/i18n/og-locale';
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

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocaleFromRequest();
  const t = await getTranslations({ locale, namespace: 'metadata' });
  const currentLocale = OG_LOCALE_MAP[locale];
  // Mirror `[locale]/layout.tsx`: advertise every other supported locale as
  // an Open Graph alternate so the landing page gives Facebook / other OG
  // consumers the same signal as the locale-scoped layout.
  const alternateLocales = Object.values(OG_LOCALE_MAP).filter((l) => l !== currentLocale);
  const siteName = t('siteName');
  const seoSiteName = t('seoSiteName');
  const siteDescription = t('siteDescription');

  return {
    title: seoSiteName,
    description: siteDescription,
    authors: [{ name: AUTHOR_NAME }],
    metadataBase: new URL(SITE_URL),
    alternates: {
      canonical: `${SITE_URL}/${locale}`,
      languages: {
        ...Object.fromEntries(SUPPORTED_LOCALES.map((l) => [l, `${SITE_URL}/${l}`])),
        'x-default': `${SITE_URL}/en`,
      },
    },
    openGraph: {
      title: seoSiteName,
      description: siteDescription,
      url: `${SITE_URL}/${locale}`,
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
      title: seoSiteName,
      description: siteDescription,
      images: ['/logo.png'],
    },
  };
}

export default async function LandingLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocaleFromRequest();
  const [t, cookieStore, bannerAnnouncement] = await Promise.all([
    getTranslations({ locale, namespace: 'metadata' }),
    cookies(),
    getLatestBannerAnnouncement(locale),
  ]);

  // Load the full client-side message dictionary so that Client Components
  // rendered below (e.g. `LockedRankIndicator` via `RanksSection` →
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
    <html lang={locale} suppressHydrationWarning>
      <head>
        <ThemeScript />
        <JsonLd data={generateWebSiteSchema(locale, t('siteName'))} />
        <JsonLd data={generateOrganizationSchema()} />
        <style dangerouslySetInnerHTML={{ __html: generateThemeCSS() }} />
      </head>
      <body className={`${inter.variable} font-sans antialiased bg-background text-foreground`}>
        <EnvironmentRibbon />
        {showBanner && (
          <AnnouncementBanner
            id={bannerAnnouncement.id}
            title={bannerAnnouncement.title}
            href={`/${locale}/announcements/${bannerAnnouncement.slug}`}
          />
        )}
        <StorageAvailabilityProvider>
          <GoogleScripts
            locale={locale}
            cookieYesId={COOKIEYES_ID}
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
