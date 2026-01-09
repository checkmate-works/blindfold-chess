import { MetadataRoute } from 'next';

// Remove trailing slash from BASE_URL if present to avoid double slashes
const BASE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://blindfold-chess.com').replace(
  /\/$/,
  ''
);

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
        '/_vercel/',
        // Block manifest files to optimize crawl budget
        '/*_buildManifest.js$',
        '/*_middlewareManifest.js$',
        '/*_ssgManifest.js$',
        // Block Next.js internal JSON files
        '/_next/data/',
      ],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
