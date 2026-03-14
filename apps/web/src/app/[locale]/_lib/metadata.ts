import type { Metadata } from 'next';

import { SITE_URL } from '@/config';

/**
 * Generate canonical URL and alternates metadata for a page
 * @param locale - Current locale (e.g., 'en', 'ja')
 * @param path - Path without locale prefix (e.g., '/learn', '/practice/algebraic-notation')
 */
export function generateCanonicalMetadata({
  locale,
  path,
}: {
  locale: string;
  path: string;
}): Metadata {
  const baseUrl = SITE_URL.replace(/\/$/, '');
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;

  const canonical = `${baseUrl}/${locale}${cleanPath ? `/${cleanPath}` : ''}`;

  const enUrl = `${baseUrl}/en${cleanPath ? `/${cleanPath}` : ''}`;
  const jaUrl = `${baseUrl}/ja${cleanPath ? `/${cleanPath}` : ''}`;

  return {
    alternates: {
      canonical,
      languages: {
        en: enUrl,
        ja: jaUrl,
        'x-default': enUrl,
      },
    },
    openGraph: {
      url: canonical,
    },
  };
}
