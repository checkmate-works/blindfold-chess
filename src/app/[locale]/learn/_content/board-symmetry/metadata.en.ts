import { commonMetadata } from './metadata.common';

export const metadata = {
  ...commonMetadata,
  title: 'Using Symmetry to Learn Coordinates',
  tags: ['coordinates', 'visualization', 'beginner'],
  excerpt:
    'By leveraging the symmetry of the chessboard, you can cut the information you need to memorize in half. Learn techniques using horizontal, vertical, and point symmetry.',
} as const;
