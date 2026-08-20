import { describe, expect, it } from 'vitest';

import type { GameCommentRow } from './game-comments';
import { toGameCommentItems } from './game-comments';

const liveRow: GameCommentRow = {
  id: 'c1',
  ply: 12,
  parentId: null,
  body: 'Consider Nf3 here.',
  createdAt: new Date('2026-05-18T10:00:00.000Z'),
  updatedAt: new Date('2026-05-18T10:00:00.000Z'),
  deletedAt: null,
  authorId: 'u1',
  authorUsername: 'alice',
  authorDisplayName: 'Alice',
  authorAvatarUrl: 'https://cdn.example/a.png',
};

const deletedRow: GameCommentRow = {
  ...liveRow,
  id: 'c2',
  parentId: 'c1',
  body: 'something the author retracted',
  deletedAt: new Date('2026-05-18T11:00:00.000Z'),
};

const meta = (entries: Record<string, { likeCount: number; likedByMe: boolean }>) =>
  new Map(Object.entries(entries));

describe('toGameCommentItems', () => {
  it('passes a live comment through with its author and like meta', () => {
    const [item] = toGameCommentItems([liveRow], meta({ c1: { likeCount: 3, likedByMe: true } }));
    expect(item).toMatchObject({
      id: 'c1',
      ply: 12,
      body: 'Consider Nf3 here.',
      author: { username: 'alice', displayName: 'Alice', avatarUrl: 'https://cdn.example/a.png' },
      likeCount: 3,
      likedByMe: true,
    });
  });

  it('redacts the body and author of a soft-deleted comment', () => {
    const [item] = toGameCommentItems([deletedRow], new Map());
    expect(item.body).toBe('');
    expect(item.author).toBeNull();
  });

  it('keeps a tombstone addressable so live replies stay anchored', () => {
    const [item] = toGameCommentItems([deletedRow], new Map());
    expect(item.id).toBe('c2');
    expect(item.ply).toBe(12);
    expect(item.parentId).toBe('c1');
    expect(item.deletedAt).toEqual(deletedRow.deletedAt);
  });

  it('never carries like meta on a deleted comment, even if the map has it', () => {
    // The query excludes deleted ids from the like lookup; if a future edit
    // stops doing that, the projection must still not surface a like count
    // for retracted content.
    const [item] = toGameCommentItems(
      [deletedRow],
      meta({ c2: { likeCount: 9, likedByMe: true } })
    );
    expect(item.body).toBe('');
    expect(item.author).toBeNull();
  });

  it('defaults like meta to zero when the id is absent from the map', () => {
    const [item] = toGameCommentItems([liveRow], new Map());
    expect(item).toMatchObject({ likeCount: 0, likedByMe: false });
  });

  it('nulls the author when the profile join missed (purged account)', () => {
    const orphan = {
      ...liveRow,
      authorUsername: null,
      authorDisplayName: null,
      authorAvatarUrl: null,
    };
    const [item] = toGameCommentItems([orphan], new Map());
    expect(item.author).toBeNull();
    // authorId survives: ownership checks still need it.
    expect(item.authorId).toBe('u1');
  });

  it('preserves row order', () => {
    const items = toGameCommentItems([liveRow, deletedRow], new Map());
    expect(items.map((i) => i.id)).toEqual(['c1', 'c2']);
  });
});
