import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Inter } from 'next/font/google';
import { cookies } from 'next/headers';

import { AUTHOR_NAME, COOKIEYES_ID, GA_MEASUREMENT_ID, SITE_URL } from '@/config';
import { generateThemeCSS } from '@blindfold-chess/ui';
import { GoogleAnalytics } from '@next/third-parties/google';

import { JsonLd, generateOrganizationSchema, generateWebSiteSchema } from '@/lib/jsonld';
import { getLocaleFromRequest } from '@/lib/locale';

import { getLatestBannerAnnouncement } from '@/app/[locale]/(public)/announcements/_lib/queries';
import { AnnouncementBanner } from '@/app/[locale]/_components/AnnouncementBanner';
import { CookieConsent } from '@/app/[locale]/_components/CookieConsent';

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
  const currentLocale = locale === 'ja' ? 'ja_JP' : 'en_US';
  const siteName = t('siteName');
  const seoSiteName = t('seoSiteName');
  const siteDescription = t('siteDescription');

  return {
    title: seoSiteName,
    description: siteDescription,
    authors: [{ name: AUTHOR_NAME }],
    metadataBase: new URL(SITE_URL),
    alternates: {
      canonical: locale === 'en' ? '/en' : '/ja',
      languages: {
        en: '/en',
        ja: '/ja',
        'x-default': '/en',
      },
    },
    openGraph: {
      title: siteName,
      description: siteDescription,
      url: locale === 'en' ? `${SITE_URL}/en` : `${SITE_URL}/ja`,
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
      title: siteName,
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
        {showBanner && (
          <AnnouncementBanner
            id={bannerAnnouncement.id}
            title={bannerAnnouncement.title}
            href={`/${locale}/announcements/${bannerAnnouncement.slug}`}
          />
        )}
        {COOKIEYES_ID && <CookieConsent cookieYesId={COOKIEYES_ID} locale={locale} />}
        {GA_MEASUREMENT_ID && <GoogleAnalytics gaId={GA_MEASUREMENT_ID} />}
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
