import { SITE_URL } from './base';

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

type ListItemWithUrl = {
  '@type': string;
  position: number;
  name: string;
  item: string;
};

type ListItemWithoutUrl = {
  '@type': string;
  position: number;
  name: string;
};

type ListItem = ListItemWithUrl | ListItemWithoutUrl;

/**
 * BreadcrumbList schema
 * @see https://schema.org/BreadcrumbList
 */
export function generateBreadcrumbListSchema(
  items: BreadcrumbItem[],
  locale: string,
  brandName: string
) {
  const baseUrl = SITE_URL;
  const localePrefix = `/${locale}`;

  const home: ListItem = {
    '@type': 'ListItem',
    position: 1,
    name: brandName,
    item: `${baseUrl}${localePrefix}`,
  };

  // The current page is listed without an `item`, so its entry omits the key.
  const trail = items.map((item, index): ListItem => ({
    '@type': 'ListItem',
    position: index + 2,
    name: item.label,
    ...(item.href ? { item: `${baseUrl}${localePrefix}${item.href}` } : {}),
  }));

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [home, ...trail],
  };
}
