import type { Metadata } from 'next';

import { AUTHOR_NAME, COOKIEYES_ID, GA_MEASUREMENT_ID, SITE_NAME, SITE_URL } from '@/config';
import { generateThemeCSS } from '@blindfold-chess/ui';
import { GoogleAnalytics } from '@next/third-parties/google';

import { JsonLd, generateOrganizationSchema, generateWebSiteSchema } from '@/lib/jsonld';
import { getLocaleFromRequest } from '@/lib/locale';

import { CookieConsent } from '@/app/[locale]/_components/CookieConsent';

import '../globals.css';
import { Providers } from './_lib/providers';

const siteDescription =
  'A free online platform for practising blindfold chess. Improve your chess visualisation and calculation skills.';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocaleFromRequest();
  const currentLocale = locale === 'ja' ? 'ja_JP' : 'en_US';

  return {
    title: SITE_NAME,
    description: siteDescription,
    authors: [{ name: AUTHOR_NAME }],
    metadataBase: new URL(SITE_URL),
    alternates: {
      canonical: '/',
    },
    openGraph: {
      title: SITE_NAME,
      description: siteDescription,
      url: SITE_URL,
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
      <body>
        {COOKIEYES_ID && <CookieConsent cookieYesId={COOKIEYES_ID} locale={locale} />}
        {GA_MEASUREMENT_ID && <GoogleAnalytics gaId={GA_MEASUREMENT_ID} />}
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
