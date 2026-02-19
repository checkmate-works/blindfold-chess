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
      // IMPORTANT: Do NOT block /_next/static/ — it contains JS and CSS files
      // required for search engines to render pages correctly.
      // Blocking these would prevent Googlebot from executing JavaScript,
      // leading to incomplete indexing of dynamically rendered content.
      // See: https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics
      disallow: [
        '/api/',
        '/_vercel/',
        // Block manifest files to optimize crawl budget
        '/*_buildManifest.js$',
        '/*_middlewareManifest.js$',
        '/*_ssgManifest.js$',
        // Block Next.js internal JSON files (not needed for rendering)
        '/_next/data/',
      ],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
