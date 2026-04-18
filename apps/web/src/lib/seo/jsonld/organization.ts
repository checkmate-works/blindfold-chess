import { AUTHOR_NAME, SITE_URL } from './base';

/**
 * Organization schema
 * @see https://schema.org/Organization
 */
export function generateOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: AUTHOR_NAME,
    url: SITE_URL,
    logo: {
      '@type': 'ImageObject',
      url: `${SITE_URL}/logo.png`,
      width: 512,
      height: 512,
    },
    description: 'CheckmateWorks builds tools and training apps for chess players.',
  };
}
