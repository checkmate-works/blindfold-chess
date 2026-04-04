import type { Metadata } from 'next';
import { getMessages, getTranslations } from 'next-intl/server';
import { Inter } from 'next/font/google';
import { notFound } from 'next/navigation';

import { AUTHOR_NAME, COOKIEYES_ID, GA_MEASUREMENT_ID, SITE_URL } from '@/config';
import { routing } from '@/i18n/routing';
import { generateThemeCSS } from '@blindfold-chess/ui';
import { GoogleAnalytics } from '@next/third-parties/google';

import { JsonLd, generateOrganizationSchema, generateWebSiteSchema } from '@/lib/jsonld';

import '../globals.css';
import { CookieConsent } from './_components/CookieConsent';
import { Footer } from './_components/Footer';
import { Header } from './_components/Header';
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
  const currentLocale = locale === 'ja' ? 'ja_JP' : 'en_US';

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
      title: siteName,
      description,
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

  // Namespaces used only by Server Components (via getTranslations()), not by
  // client-side useTranslations(). Excluding them reduces the client payload.
  // New namespaces are included in the client bundle by default for safety;
  // add a namespace here only after confirming it is never used in client code.
  const serverOnlyNamespaces = [
    'metadata',
    'Header',
    'faq',
    'glossary',
    'manual',
    'gettingStarted',
    'learn',
    'privacy',
    'terms',
    'company',
    'landing',
    'posts',
  ];

  const messages = Object.fromEntries(
    Object.entries(allMessages as Record<string, unknown>).filter(
      ([key]) => !serverOnlyNamespaces.includes(key)
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
        {COOKIEYES_ID && <CookieConsent cookieYesId={COOKIEYES_ID} locale={locale} />}
        {GA_MEASUREMENT_ID && <GoogleAnalytics gaId={GA_MEASUREMENT_ID} />}
        <Providers locale={locale} messages={messages}>
          <div className="flex flex-col min-h-screen">
            <Header locale={locale} />
            <main className="flex-1 bg-secondary">
              <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</div>
            </main>
            <Footer locale={locale} />
          </div>
        </Providers>
      </body>
    </html>
  );
}
