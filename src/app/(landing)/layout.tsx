import '../globals.css';
import { siteUrl, siteName, authorName } from '@/config';

const siteDescription =
  'Free online platform to practice chess without seeing pieces. Master blindfold chess, improve your visualization and calculation skills.';

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{siteName}</title>
        <meta name="description" content={siteDescription} />
        <meta name="author" content={authorName} />
        <link rel="canonical" href={siteUrl} />

        <meta property="og:title" content={siteName} />
        <meta property="og:description" content={siteDescription} />
        <meta property="og:url" content={siteUrl} />
        <meta property="og:site_name" content={siteName} />
        <meta property="og:type" content="website" />
        <meta property="og:locale" content="en_US" />
        <meta property="og:image" content={`${siteUrl}/logo.png`} />
        <meta property="og:image:width" content="512" />
        <meta property="og:image:height" content="512" />
        <meta property="og:image:alt" content={`${siteName} Logo`} />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={siteName} />
        <meta name="twitter:description" content={siteDescription} />
        <meta name="twitter:image" content={`${siteUrl}/logo.png`} />
      </head>
      <body>{children}</body>
    </html>
  );
}
