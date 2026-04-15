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

  // Start with home
  const listItems: ListItem[] = [
    {
      '@type': 'ListItem',
      position: 1,
      name: brandName,
      item: `${baseUrl}${localePrefix}`,
    },
  ];

  // Add remaining items
  items.forEach((item, index) => {
    const position = index + 2;

    if (item.href) {
      listItems.push({
        '@type': 'ListItem',
        position,
        name: item.label,
        item: `${baseUrl}${localePrefix}${item.href}`,
      });
    } else {
      listItems.push({
        '@type': 'ListItem',
        position,
        name: item.label,
      });
    }
  });

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: listItems,
  };
}
