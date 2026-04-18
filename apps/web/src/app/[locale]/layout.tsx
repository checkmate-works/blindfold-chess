import type { Metadata } from 'next';
import { getMessages, getTranslations } from 'next-intl/server';
import { Inter } from 'next/font/google';
import { notFound } from 'next/navigation';

import { AUTHOR_NAME, COOKIEYES_ID, GA_MEASUREMENT_ID, SITE_URL } from '@/config';
import { routing } from '@/i18n/routing';
import { generateThemeCSS } from '@blindfold-chess/ui';
import { GoogleAnalytics } from '@next/third-parties/google';

import { JsonLd, generateOrganizationSchema, generateWebSiteSchema } from '@/lib/seo/jsonld';

import '../globals.css';
import { CookieConsent } from './_components/CookieConsent';
import { EnvironmentRibbon } from './_components/EnvironmentRibbon';
import { Footer } from './_components/Footer';
import { Header } from './_components/Header';
import { MobileTabBar } from './_components/MobileTabBar';
import { isServerOnlyNamespace } from './_lib/i18n-namespaces';
import { buildPageTitle } from './_lib/metadata';
import { Providers } from './_lib/providers';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;

  let t: Awaited<ReturnType<typeof getTranslations<'metadata'>>>;
  try {
    t = await getTranslations({ locale, namespace: 'metadata' });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[generateMetadata] getTranslations failed, using fallback:', error);
    }
    t = ((key: string) => key) as typeof t;
  }

  const siteName = t('siteName');
  const seoSiteName = t('seoSiteName');
  const description = t('siteDescription');
  const OG_LOCALE_MAP: Record<string, string> = { en: 'en_US', ja: 'ja_JP', es: 'es_ES' };
  const currentLocale = OG_LOCALE_MAP[locale] ?? 'en_US';
  const alternateLocales = Object.values(OG_LOCALE_MAP).filter((l) => l !== currentLocale);

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
      title: buildPageTitle(seoSiteName, locale),
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
      title: buildPageTitle(seoSiteName, locale),
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
  const { locale } = await params;

  // Ensure that the incoming `locale` is valid
  if (!(routing.locales as readonly string[]).includes(locale)) {
    notFound();
  }

  let t: Awaited<ReturnType<typeof getTranslations<'metadata'>>>;
  let allMessages: Awaited<ReturnType<typeof getMessages>>;

  try {
    t = await getTranslations({ locale, namespace: 'metadata' });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[layout] getTranslations failed, using fallback:', error);
    }
    // Minimal fallback that supports only the t(key) call form used in this file.
    // Methods like t.rich(), t.markup() etc. are NOT available on this fallback.
    t = ((key: string) => key) as typeof t;
  }

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
    <html lang={locale} suppressHydrationWarning>
      <head>
        <JsonLd data={generateWebSiteSchema(locale, t('siteName'))} />
        <JsonLd data={generateOrganizationSchema()} />
        <style dangerouslySetInnerHTML={{ __html: generateThemeCSS() }} />
      </head>
      <body className={`${inter.variable} font-sans antialiased bg-background text-foreground`}>
        <EnvironmentRibbon />
        {COOKIEYES_ID && <CookieConsent cookieYesId={COOKIEYES_ID} locale={locale} />}
        {GA_MEASUREMENT_ID && <GoogleAnalytics gaId={GA_MEASUREMENT_ID} />}
        <Providers locale={locale} messages={messages}>
          <div className="flex flex-col min-h-screen">
            <Header locale={locale} />
            <main className="flex-1 bg-secondary">
              <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</div>
            </main>
            <Footer locale={locale} />
            {/* Spacer to prevent the fixed MobileTabBar from covering the footer */}
            <div className="h-14 md:h-0" />
            <MobileTabBar />
          </div>
        </Providers>
      </body>
    </html>
  );
}
