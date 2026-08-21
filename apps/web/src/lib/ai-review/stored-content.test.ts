import { describe, expect, it } from 'vitest';

import { normalizeStoredContent } from './stored-content';

const REST = { momentComments: [], strengths: ['a'], weaknesses: ['b'], advice: ['c'] };

describe('normalizeStoredContent', () => {
  it('reads a pre-list paragraph as a one-item list', () => {
    expect(normalizeStoredContent({ ...REST, summary: 'One long paragraph.' }).summary).toEqual([
      'One long paragraph.',
    ]);
  });

  it('passes a list through unchanged', () => {
    expect(normalizeStoredContent({ ...REST, summary: ['x', 'y'] }).summary).toEqual(['x', 'y']);
  });
});
