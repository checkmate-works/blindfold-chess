import type { Metadata } from 'next';

import { SITE_URL } from '@/config';

/**
 * Generate canonical URL, alternates, and openGraph metadata for a page.
 * @param locale - Current locale (e.g., 'en', 'ja')
 * @param path - Path without locale prefix (e.g., '/learn', '/practice/algebraic-notation')
 * @param title - Optional page title for openGraph
 * @param description - Optional page description for openGraph
 */
export function generateCanonicalMetadata({
  locale,
  path,
  title,
  description,
}: {
  locale: string;
  path: string;
  title?: string;
  description?: string;
}): Metadata {
  const baseUrl = SITE_URL;
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
      ...(title && { title }),
      ...(description && { description }),
    },
  };
}
