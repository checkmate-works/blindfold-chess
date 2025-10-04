import '../globals.css';
import { GoogleAnalytics } from '@next/third-parties/google';
import type { Metadata } from 'next';
import { SITE_URL, SITE_NAME, AUTHOR_NAME, GA_MEASUREMENT_ID } from '@/config';
import { Providers } from './_lib/providers';

const siteDescription =
  'A free online platform for practising blindfold chess. Improve your chess visualisation and calculation skills.';

export const metadata: Metadata = {
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
    locale: 'en_US',
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

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        {GA_MEASUREMENT_ID && <GoogleAnalytics gaId={GA_MEASUREMENT_ID} />}
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
