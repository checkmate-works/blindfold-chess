import { commonMetadata } from './metadata.common';

export const metadata = {
  ...commonMetadata,
  title: 'The Secret of Chess Master Memory',
  tags: ['cognitive science', 'memory', 'pattern recognition'],
  excerpt:
    'The historic 1946 experiment that revealed the surprising memory mechanisms of chess masters. Why can GMs remember positions but struggle with random placements?',
} as const;
