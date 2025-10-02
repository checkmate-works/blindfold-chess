import { SITE_URL } from '@/config';
import type { Metadata } from 'next';

type GenerateCanonicalMetadataParams = {
  locale: string;
  path: string;
};

/**
 * Generate canonical URL and alternates metadata for a page
 * @param locale - Current locale (e.g., 'en', 'ja')
 * @param path - Path without locale prefix (e.g., '/learn', '/practice/algebraic-notation')
 */
export function generateCanonicalMetadata({
  locale,
  path,
}: GenerateCanonicalMetadataParams): Metadata {
  // Remove leading slash if present
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;

  // Build canonical URL with locale
  const canonical = `${SITE_URL}/${locale}${cleanPath ? `/${cleanPath}` : ''}`;

  // Build alternate URLs for all locales
  const enUrl = `${SITE_URL}/en${cleanPath ? `/${cleanPath}` : ''}`;
  const jaUrl = `${SITE_URL}/ja${cleanPath ? `/${cleanPath}` : ''}`;

  return {
    alternates: {
      canonical,
      languages: {
        en: enUrl,
        ja: jaUrl,
      },
    },
  };
}
