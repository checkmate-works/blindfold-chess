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
      disallow: ['/api/', '/_next/', '/_vercel/'],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
