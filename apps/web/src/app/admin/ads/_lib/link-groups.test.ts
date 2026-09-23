import { describe, expect, it } from 'vitest';

import { PLACEHOLDER_AD_HREF } from '@/lib/ads/placeholder';

import { groupCreativesByTitle } from './link-groups';

const LINK = 'https://awin1.com/cread.php?awinmid=1&awinaffid=2';

describe('groupCreativesByTitle', () => {
  it('gathers the rows of one book across slots and reports where its link stands', () => {
    const groups = groupCreativesByTitle(
      [
        { id: 'a', slot: 'feed-native-ad', href: PLACEHOLDER_AD_HREF, isActive: false },
        { id: 'b', slot: 'puzzle-list-native-ad', href: LINK, isActive: true },
        { id: 'c', slot: 'puzzle-list-native-ad', href: LINK, isActive: false },
        { id: 'd', slot: 'feed-native-ad', href: PLACEHOLDER_AD_HREF, isActive: false },
      ],
      new Map([
        ['a', 'Woodpecker'],
        ['b', 'Woodpecker'],
        ['c', 'Woodpecker'],
        ['d', 'Attacking'],
      ])
    );

    expect(groups).toEqual([
      {
        title: 'Attacking',
        creativeIds: ['d'],
        slots: ['feed-native-ad'],
        activeCount: 0,
        placeholderCount: 1,
        hrefs: [],
      },
      {
        title: 'Woodpecker',
        creativeIds: ['a', 'b', 'c'],
        slots: ['feed-native-ad', 'puzzle-list-native-ad'],
        activeCount: 1,
        placeholderCount: 1,
        hrefs: [LINK],
      },
    ]);
  });

  it('skips a row with no English title rather than grouping it under an empty one', () => {
    expect(
      groupCreativesByTitle(
        [{ id: 'a', slot: 'feed-native-ad', href: LINK, isActive: false }],
        new Map()
      )
    ).toEqual([]);
  });
});
