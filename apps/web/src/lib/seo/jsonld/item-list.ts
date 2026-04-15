export type ItemListItemData = {
  name: string;
  url: string;
};

/**
 * ItemList schema
 * @see https://schema.org/ItemList
 */
export function generateItemListSchema(items: ItemListItemData[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      url: item.url,
    })),
  };
}
