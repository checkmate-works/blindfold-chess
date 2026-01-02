import { commonMetadata } from './metadata.common';

export const metadata = {
  ...commonMetadata,
  title: 'Instantly Recognize Squares with Anchor Points',
  tags: ['coordinates', 'visualization', 'beginner'],
  excerpt:
    'Instead of memorizing 64 squares individually, use key squares as reference points. A perfect first step for blindfold chess.',
} as const;
