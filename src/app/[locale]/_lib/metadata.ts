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
  // Remove trailing slash from SITE_URL and leading slash from path
  const baseUrl = SITE_URL.replace(/\/$/, '');
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;

  // Build canonical URL with locale
  const canonical = `${baseUrl}/${locale}${cleanPath ? `/${cleanPath}` : ''}`;

  // Build alternate URLs for all locales
  const enUrl = `${baseUrl}/en${cleanPath ? `/${cleanPath}` : ''}`;
  const jaUrl = `${baseUrl}/ja${cleanPath ? `/${cleanPath}` : ''}`;

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
