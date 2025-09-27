import '../globals.css';
import { GoogleAnalytics } from '@next/third-parties/google';
import type { Metadata } from 'next';
import { siteUrl, siteName, authorName, GA_MEASUREMENT_ID } from '@/config';

const siteDescription =
  'Free online platform to practice chess without seeing pieces. Master blindfold chess, improve your visualization and calculation skills.';

export const metadata: Metadata = {
  title: siteName,
  description: siteDescription,
  authors: [{ name: authorName }],
  metadataBase: new URL(siteUrl),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: siteName,
    description: siteDescription,
    url: siteUrl,
    siteName: siteName,
    type: 'website',
    locale: 'en_US',
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

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const theme = localStorage.getItem('theme');
                if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              })();
            `,
          }}
        />
      </head>
      <body>
        {GA_MEASUREMENT_ID && <GoogleAnalytics gaId={GA_MEASUREMENT_ID} />}
        {children}
      </body>
    </html>
  );
}
