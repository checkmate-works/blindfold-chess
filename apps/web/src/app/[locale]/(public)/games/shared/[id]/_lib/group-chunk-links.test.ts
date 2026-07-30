import { describe, expect, it } from 'vitest';

import type { GameChunkItem } from '@/lib/db/game-chunks';

import { groupChunkLinksBySuggester } from './group-chunk-links';

function link(id: string, suggestedById: string | null): GameChunkItem {
  return {
    id,
    ply: 0,
    chunkId: `c-${id}`,
    slug: id,
    title: id,
    description: null,
    representativeFen: '8/8/8/8/8/8/8/8 w - - 0 1',
    status: 'published' as const,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    suggestedById,
    suggester: null,
  };
}

const ids = (groups: GameChunkItem[][]) => groups.map((g) => g.map((i) => i.id));

describe('groupChunkLinksBySuggester', () => {
  it('merges consecutive links by the same suggester into one group', () => {
    const groups = groupChunkLinksBySuggester([
      link('a1', 'u1'),
      link('a2', 'u1'),
      link('a3', 'u1'),
    ]);
    expect(ids(groups)).toEqual([['a1', 'a2', 'a3']]);
  });

  it('starts a new group when the suggester changes', () => {
    const groups = groupChunkLinksBySuggester([
      link('a1', 'u1'),
      link('b1', 'u2'),
      link('a2', 'u1'),
    ]);
    expect(ids(groups)).toEqual([['a1'], ['b1'], ['a2']]);
  });

  it('does not reorder across a third party splitting a run', () => {
    const groups = groupChunkLinksBySuggester([
      link('a1', 'u1'),
      link('a2', 'u1'),
      link('b1', 'u2'),
      link('a3', 'u1'),
    ]);
    expect(ids(groups)).toEqual([['a1', 'a2'], ['b1'], ['a3']]);
  });

  it('returns no groups for an empty list', () => {
    expect(groupChunkLinksBySuggester([])).toEqual([]);
  });
});
