import type { ArticleMetadata } from '../../_lib/types';
import { commonMetadata } from './metadata.common';

export const metadata: ArticleMetadata = {
  ...commonMetadata,
  title: 'Overcoming Coordinate Mirror Confusion',
  excerpt:
    'Why does confusion between a-file and h-file happen? Understand the difference between fixed and variable perspective models to develop stable coordinate recognition.',
  tags: ['coordinates', 'mental-model', 'perspective', 'intermediate'],
};
