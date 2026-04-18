import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
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
import { generateThemeCSS } from '@blindfold-chess/ui';

import { getLocaleFromRequest } from '@/lib/locale';
import { JsonLd, generateOrganizationSchema, generateWebSiteSchema } from '@/lib/seo/jsonld';
import { StorageAvailabilityProvider } from '@/lib/storage/StorageAvailabilityProvider';

import { getLatestBannerAnnouncement } from '@/app/[locale]/(public)/announcements/_lib/queries';
import { AnnouncementBanner } from '@/app/[locale]/_components/AnnouncementBanner';

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
  const OG_LOCALE_MAP: Record<string, string> = { en: 'en_US', ja: 'ja_JP', es: 'es_ES' };
  const currentLocale = OG_LOCALE_MAP[locale] ?? 'en_US';
  const siteName = t('siteName');
  const seoSiteName = t('seoSiteName');
  const siteDescription = t('siteDescription');

  return {
    title: seoSiteName,
    description: siteDescription,
    authors: [{ name: AUTHOR_NAME }],
    metadataBase: new URL(SITE_URL),
    alternates: {
      canonical: `/${locale}`,
      languages: {
        ...Object.fromEntries(SUPPORTED_LOCALES.map((l) => [l, `/${l}`])),
        'x-default': '/en',
      },
    },
    openGraph: {
      title: seoSiteName,
      description: siteDescription,
      url: `${SITE_URL}/${locale}`,
      siteName: siteName,
      type: 'website',
      locale: currentLocale,
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

  const dismissedId = cookieStore.get('dismissed-announcement')?.value;
  const showBanner = bannerAnnouncement && bannerAnnouncement.id !== dismissedId;

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
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
          <Providers>{children}</Providers>
        </StorageAvailabilityProvider>
      </body>
    </html>
  );
}
