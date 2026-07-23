import { describe, expect, it, vi } from 'vitest';

import { type ResolvedEntities, grantHref } from './resolveHistoryLinks';

// resolveHistoryLinks.ts is a server module ('server-only' + db); stub the
// marker so the pure grantHref export can be imported here.
vi.mock('server-only', () => ({}));

const empty: ResolvedEntities = {
  livePositionIds: new Set(),
  chunkSlugById: new Map(),
  topicMetaById: new Map(),
  liveRepertoireIds: new Set(),
  liveGameIds: new Set(),
};

describe('grantHref', () => {
  it('links id-based sources to their detail pages when live', () => {
    const resolved: ResolvedEntities = {
      ...empty,
      livePositionIds: new Set(['p1', 'm1']),
      liveRepertoireIds: new Set(['r1']),
      liveGameIds: new Set(['g1']),
    };
    expect(grantHref('puzzle_created', 'p1', resolved)).toBe('/practice/puzzle/p1');
    expect(grantHref('position_memory_created', 'm1', resolved)).toBe(
      '/practice/position-memory/m1'
    );
    expect(grantHref('repertoire_published', 'r1', resolved)).toBe('/repertoires/r1');
    expect(grantHref('game_published', 'g1', resolved)).toBe('/games/shared/g1');
  });

  it('links a chunk via its resolved slug (not its id)', () => {
    const resolved = { ...empty, chunkSlugById: new Map([['c1', 'my-chunk-slug']]) };
    expect(grantHref('chunk_created', 'c1', resolved)).toBe('/chunks/my-chunk-slug');
  });

  it('links a topic post via its topic type + key (square / opening segments)', () => {
    const resolved: ResolvedEntities = {
      ...empty,
      topicMetaById: new Map([
        ['sq1', { topicType: 'square', topicKey: 'e4' }],
        ['op1', { topicType: 'opening', topicKey: 'french' }],
      ]),
    };
    expect(grantHref('topic_post_created', 'sq1', resolved)).toBe('/topics/squares/e4/posts/sq1');
    expect(grantHref('topic_post_created', 'op1', resolved)).toBe(
      '/topics/openings/french/posts/op1'
    );
  });

  it('returns null when the target is not live (deleted) — no 404 link', () => {
    // Empty resolved sets model a soft-deleted (or missing) target: the row
    // renders as plain text, and the clawback row explains the reversal.
    expect(grantHref('puzzle_created', 'p1', empty)).toBeNull();
    expect(grantHref('position_memory_created', 'm1', empty)).toBeNull();
    expect(grantHref('chunk_created', 'c1', empty)).toBeNull();
    expect(grantHref('repertoire_published', 'r1', empty)).toBeNull();
    expect(grantHref('game_published', 'g1', empty)).toBeNull();
    expect(grantHref('topic_post_created', 't1', empty)).toBeNull();
  });

  it('returns null for non-UGC / unknown sources', () => {
    expect(grantHref('like_grant', 'x', empty)).toBeNull();
    expect(grantHref('admin_grant', 'x', empty)).toBeNull();
    expect(grantHref('redemption', 'x', empty)).toBeNull();
  });
});
