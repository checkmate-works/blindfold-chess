import { describe, expect, it } from 'vitest';

import { SITE_URL } from './base';
import { generateBreadcrumbListSchema } from './breadcrumb';

describe('generateBreadcrumbListSchema', () => {
  it('leads with the localized home and numbers the trail from 2', () => {
    const schema = generateBreadcrumbListSchema(
      [{ label: 'Practice', href: '/practice' }, { label: 'Puzzle' }],
      'ja',
      'Shingan Chess'
    );

    expect(schema).toStrictEqual({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Shingan Chess', item: `${SITE_URL}/ja` },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Practice',
          item: `${SITE_URL}/ja/practice`,
        },
        // The current page has no href, and its entry carries no `item` key at all.
        { '@type': 'ListItem', position: 3, name: 'Puzzle' },
      ],
    });
  });

  it('treats an empty href as no link', () => {
    const schema = generateBreadcrumbListSchema([{ label: 'Here', href: '' }], 'en', 'Brand');
    expect(schema.itemListElement[1]).toStrictEqual({
      '@type': 'ListItem',
      position: 2,
      name: 'Here',
    });
  });

  it('is just the home entry for an empty trail', () => {
    expect(generateBreadcrumbListSchema([], 'en', 'Brand').itemListElement).toHaveLength(1);
  });
});
