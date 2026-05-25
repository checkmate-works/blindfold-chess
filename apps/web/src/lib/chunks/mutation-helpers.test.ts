import { describe, expect, it } from 'vitest';

import type { BoardAnnotations } from '@/lib/board-annotations/types';

import { buildChunkCreateValues } from './mutation-helpers';
import type { ChunkMutationData } from './validation';

const BASE: ChunkMutationData = {
  representativeFen: '  8/8/8/8/8/8/R7/Q6K w - - 0 1  ',
  title: '  Heavy Battery  ',
  slug: '  heavy-battery  ',
  description: '  Queen behind rook  ',
  userId: '  00000000-0000-0000-0000-000000000001  ',
};

const SAMPLE_ANNOTATIONS: BoardAnnotations = {
  arrows: [{ from: 'a1', to: 'a8', color: 'green' }],
  circles: [{ square: 'd4', color: 'yellow' }],
};

describe('buildChunkCreateValues', () => {
  it('trims string fields', () => {
    const result = buildChunkCreateValues(BASE);
    expect(result.representativeFen).toBe('8/8/8/8/8/8/R7/Q6K w - - 0 1');
    expect(result.title).toBe('Heavy Battery');
    expect(result.slug).toBe('heavy-battery');
    expect(result.description).toBe('Queen behind rook');
    expect(result.userId).toBe('00000000-0000-0000-0000-000000000001');
  });

  it('coerces an empty description to null', () => {
    expect(buildChunkCreateValues({ ...BASE, description: '' }).description).toBeNull();
    expect(buildChunkCreateValues({ ...BASE, description: '   ' }).description).toBeNull();
    expect(buildChunkCreateValues({ ...BASE, description: null }).description).toBeNull();
  });

  it('forwards annotations verbatim when provided', () => {
    const result = buildChunkCreateValues({ ...BASE, annotations: SAMPLE_ANNOTATIONS });
    expect(result.annotations).toEqual(SAMPLE_ANNOTATIONS);
  });

  it('keeps annotations undefined when omitted, so drizzle skips the column', () => {
    // `undefined` is significant — drizzle treats it as "do not set this
    // column", which on UPDATE preserves the prior value and on INSERT
    // falls back to the DB default `{arrows:[], circles:[]}`. A spurious
    // empty object here would clobber existing annotations on every edit.
    const result = buildChunkCreateValues(BASE);
    expect(result.annotations).toBeUndefined();
  });
});
