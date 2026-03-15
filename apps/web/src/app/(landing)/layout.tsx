import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Inter } from 'next/font/google';

import { AUTHOR_NAME, COOKIEYES_ID, GA_MEASUREMENT_ID, SITE_NAME, SITE_URL } from '@/config';
import { generateThemeCSS } from '@blindfold-chess/ui';
import { GoogleAnalytics } from '@next/third-parties/google';

import { JsonLd, generateOrganizationSchema, generateWebSiteSchema } from '@/lib/jsonld';
import { getLocaleFromRequest } from '@/lib/locale';

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
  const siteDescription = t('siteDescription');

  return {
    title: SITE_NAME,
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
      title: SITE_NAME,
      description: siteDescription,
      url: locale === 'en' ? `${SITE_URL}/en` : `${SITE_URL}/ja`,
      siteName: SITE_NAME,
      type: 'website',
      locale: currentLocale,
      images: [
        {
          url: '/logo.png',
          width: 512,
          height: 512,
          alt: `${SITE_NAME} Logo`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: SITE_NAME,
      description: siteDescription,
      images: ['/logo.png'],
    },
  };
}

export default async function LandingLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocaleFromRequest();

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <JsonLd data={generateWebSiteSchema(locale)} />
        <JsonLd data={generateOrganizationSchema()} />
        <style dangerouslySetInnerHTML={{ __html: generateThemeCSS() }} />
      </head>
      <body className={`${inter.variable} font-sans antialiased bg-background text-foreground`}>
        {COOKIEYES_ID && <CookieConsent cookieYesId={COOKIEYES_ID} locale={locale} />}
        {GA_MEASUREMENT_ID && <GoogleAnalytics gaId={GA_MEASUREMENT_ID} />}
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
