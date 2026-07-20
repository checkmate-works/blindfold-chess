import { describe, expect, it } from 'vitest';

import type { ContentRow, LikeRow, PositionRow } from './grant-like-coins-intents';
import { buildGrantIntents, directGrantKey, forkGrantKey } from './grant-like-coins-intents';

// --- Fixtures ---------------------------------------------------------------

const OWNER = 'owner-1';
const LIKER = 'liker-1';
const PARENT_OWNER = 'parent-owner-1';

function topicPostLike(targetId: string, likerId: string = LIKER): LikeRow {
  return { likerId, targetType: 'topic_post', targetId };
}

function positionLike(targetId: string, likerId: string = LIKER): LikeRow {
  return { likerId, targetType: 'position', targetId };
}

function content(ownerId: string | null, deletedAt: Date | null = null): ContentRow {
  return { ownerId, deletedAt };
}

function position(
  ownerId: string | null,
  forkedFromId: string | null = null,
  deletedAt: Date | null = null
): PositionRow {
  return { ownerId, forkedFromId, deletedAt };
}

function run(input: {
  likeRows: LikeRow[];
  positionById?: Map<string, PositionRow>;
  topicPostById?: Map<string, ContentRow>;
  forkParentById?: Map<string, ContentRow>;
}) {
  return buildGrantIntents({
    likeRows: input.likeRows,
    positionById: input.positionById ?? new Map(),
    topicPostById: input.topicPostById ?? new Map(),
    forkParentById: input.forkParentById ?? new Map(),
  });
}

// --- Direct grants ----------------------------------------------------------

describe('buildGrantIntents — direct grants', () => {
  it('grants one coin to the topic_post owner', () => {
    const intents = run({
      likeRows: [topicPostLike('post-1')],
      topicPostById: new Map([['post-1', content(OWNER)]]),
    });
    expect(intents).toEqual([
      {
        recipientId: OWNER,
        idempotencyKey: directGrantKey('topic_post', 'post-1', LIKER),
        targetType: 'topic_post',
        targetId: 'post-1',
        likerId: LIKER,
        via: 'direct',
      },
    ]);
  });

  it('grants one coin to the position owner', () => {
    const intents = run({
      likeRows: [positionLike('pos-1')],
      positionById: new Map([['pos-1', position(OWNER)]]),
    });
    expect(intents).toHaveLength(1);
    expect(intents[0]).toMatchObject({ recipientId: OWNER, via: 'direct' });
  });

  it('withholds the direct grant on a self-like (liker is the owner)', () => {
    const intents = run({
      likeRows: [topicPostLike('post-1', OWNER)],
      topicPostById: new Map([['post-1', content(OWNER)]]),
    });
    expect(intents).toEqual([]);
  });

  it('skips soft-deleted content', () => {
    const intents = run({
      likeRows: [topicPostLike('post-1')],
      topicPostById: new Map([['post-1', content(OWNER, new Date())]]),
    });
    expect(intents).toEqual([]);
  });

  it('skips missing / orphaned content', () => {
    const intents = run({ likeRows: [topicPostLike('gone')] });
    expect(intents).toEqual([]);
  });

  it('skips content whose owner was anonymised (null ownerId — no payee)', () => {
    const intents = run({
      likeRows: [topicPostLike('post-1'), positionLike('pos-1')],
      topicPostById: new Map([['post-1', content(null)]]),
      positionById: new Map([['pos-1', position(null)]]),
    });
    expect(intents).toEqual([]);
  });

  it('ignores unknown target types', () => {
    const intents = run({ likeRows: [{ likerId: LIKER, targetType: 'article', targetId: 'a-1' }] });
    expect(intents).toEqual([]);
  });
});

// --- Fork propagation -------------------------------------------------------

describe('buildGrantIntents — fork propagation', () => {
  it('grants a second coin to the fork parent owner', () => {
    const intents = run({
      likeRows: [positionLike('fork-1')],
      positionById: new Map([['fork-1', position(OWNER, 'parent-1')]]),
      forkParentById: new Map([['parent-1', content(PARENT_OWNER)]]),
    });
    expect(intents).toHaveLength(2);
    expect(intents.map((i) => i.via)).toEqual(['direct', 'fork']);
    const fork = intents.find((i) => i.via === 'fork')!;
    expect(fork.recipientId).toBe(PARENT_OWNER);
    expect(fork.idempotencyKey).toBe(forkGrantKey('position', 'fork-1', LIKER));
  });

  it('withholds the fork coin on a self-fork (parent owner == fork owner)', () => {
    const intents = run({
      likeRows: [positionLike('fork-1')],
      positionById: new Map([['fork-1', position(OWNER, 'parent-1')]]),
      forkParentById: new Map([['parent-1', content(OWNER)]]),
    });
    expect(intents).toHaveLength(1);
    expect(intents[0].via).toBe('direct');
  });

  it('withholds the fork coin when the liker owns the fork parent', () => {
    const intents = run({
      likeRows: [positionLike('fork-1', PARENT_OWNER)],
      positionById: new Map([['fork-1', position(OWNER, 'parent-1')]]),
      forkParentById: new Map([['parent-1', content(PARENT_OWNER)]]),
    });
    expect(intents).toHaveLength(1);
    expect(intents[0].via).toBe('direct');
  });

  it('withholds the fork coin when the parent is soft-deleted', () => {
    const intents = run({
      likeRows: [positionLike('fork-1')],
      positionById: new Map([['fork-1', position(OWNER, 'parent-1')]]),
      forkParentById: new Map([['parent-1', content(PARENT_OWNER, new Date())]]),
    });
    expect(intents).toHaveLength(1);
    expect(intents[0].via).toBe('direct');
  });

  it('withholds the fork coin when the parent no longer exists', () => {
    const intents = run({
      likeRows: [positionLike('fork-1')],
      positionById: new Map([['fork-1', position(OWNER, 'missing-parent')]]),
    });
    expect(intents).toHaveLength(1);
    expect(intents[0].via).toBe('direct');
  });

  it('withholds the fork coin when the parent owner was anonymised (null)', () => {
    const intents = run({
      likeRows: [positionLike('fork-1')],
      positionById: new Map([['fork-1', position(OWNER, 'parent-1')]]),
      forkParentById: new Map([['parent-1', content(null)]]),
    });
    expect(intents).toHaveLength(1);
    expect(intents[0].via).toBe('direct');
  });

  it('does not propagate when the position is not a fork', () => {
    const intents = run({
      likeRows: [positionLike('pos-1')],
      positionById: new Map([['pos-1', position(OWNER, null)]]),
    });
    expect(intents).toHaveLength(1);
    expect(intents[0].via).toBe('direct');
  });

  it('still propagates the fork coin when the direct grant was withheld as a self-like', () => {
    // The forker likes their own fork: no direct coin to themselves, but the
    // fork-propagation coin to the (different) parent owner still fires.
    const intents = run({
      likeRows: [positionLike('fork-1', OWNER)],
      positionById: new Map([['fork-1', position(OWNER, 'parent-1')]]),
      forkParentById: new Map([['parent-1', content(PARENT_OWNER)]]),
    });
    expect(intents).toHaveLength(1);
    expect(intents[0]).toMatchObject({ via: 'fork', recipientId: PARENT_OWNER });
  });

  it('does not propagate past one level (fork-of-a-fork like only pays its own parent)', () => {
    // Liking fork-2 (forked from fork-1) pays fork-2's owner and fork-1's
    // owner — never the original grandparent.
    const intents = run({
      likeRows: [positionLike('fork-2')],
      positionById: new Map([['fork-2', position(OWNER, 'fork-1')]]),
      forkParentById: new Map([['fork-1', content(PARENT_OWNER)]]),
    });
    expect(intents).toHaveLength(2);
    expect(intents.find((i) => i.via === 'fork')!.recipientId).toBe(PARENT_OWNER);
  });
});

// --- Key shapes -------------------------------------------------------------

describe('idempotency key shapes', () => {
  it('uses the pair (targetType, targetId, likerId) — not the like row id', () => {
    expect(directGrantKey('topic_post', 't-1', 'u-1')).toBe('like_grant:topic_post:t-1:u-1');
    expect(forkGrantKey('position', 'p-1', 'u-1')).toBe('like_grant_fork:position:p-1:u-1');
  });
});
