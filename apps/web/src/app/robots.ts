import type { MetadataRoute } from 'next';

import { SITE_URL } from '@/config';

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
        // The embeddable replay is the same game as its canonical
        // `/[locale]/games/shared/[id]` page, which is the URL meant to rank.
        // The pages carry `noindex` too (see `app/embed/layout.tsx`); this
        // additionally spares the crawl budget, since every article that
        // embeds a game links one.
        '/embed/',
        // Block manifest files to optimize crawl budget
        '/*_buildManifest.js$',
        '/*_middlewareManifest.js$',
        '/*_ssgManifest.js$',
        // Block Next.js internal JSON files (not needed for rendering)
        '/_next/data/',
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
