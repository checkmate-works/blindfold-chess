import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getAttachmentsForPosts } from './get-attachments-for-posts';
import type { PostAttachment } from './get-attachments-for-posts';

vi.mock('server-only', () => ({}));

const sentryWarn = vi.fn();

vi.mock('@sentry/nextjs', () => ({
  captureMessage: (msg: string, ctx: unknown) => sentryWarn(msg, ctx),
}));

// Stable Supabase URL so buildPostImagePublicUrl produces a deterministic
// string the tests can assert on.
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://supabase.test';

// chess-core is pulled in for the PGN branch. Stub it to constants so the
// PGN row test does not need a real PGN — we are testing the aggregator's
// shape, not the chess parser.
vi.mock('@blindfold-chess/features/chess-core', () => ({
  parsePgnWithFen: () => ({ startingFen: undefined, moves: [] }),
  getStartingFen: () => 'STARTING_FEN',
  getFenAfterMoves: () => 'FINAL_FEN',
}));

// Build a chainable Drizzle query stub. Each select() call resolves to the
// next pre-queued row array so we can drive the five parallel branches
// independently.
const queueRows: unknown[][] = [];

vi.mock('@/lib/db', () => {
  const chain = () => {
    const rows = queueRows.shift() ?? [];
    const promiseLike = {
      then: (onFulfilled: (v: unknown[]) => unknown) => Promise.resolve(rows).then(onFulfilled),
      from: () => promiseLike,
      innerJoin: () => promiseLike,
      where: () => promiseLike,
      orderBy: () => promiseLike,
      limit: () => promiseLike,
    };
    return promiseLike;
  };

  return {
    db: { select: () => chain() },
    // Tables are referenced as drizzle column wrappers; the chain stub
    // ignores them entirely, so plain markers suffice.
    postGamePgnAttachments: { __name: 'pgn' },
    postGameEmbedAttachments: { __name: 'embed' },
    postImageAttachments: { __name: 'image' },
    postFenAttachments: { __name: 'fen' },
    postVideoAttachments: { __name: 'video' },
    topicPosts: { __name: 'topic_posts' },
  };
});

beforeEach(() => {
  queueRows.length = 0;
  sentryWarn.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

const POST_A = '11111111-1111-1111-1111-111111111111';
const POST_B = '22222222-2222-2222-2222-222222222222';
const POST_C = '33333333-3333-3333-3333-333333333333';
const POST_D = '44444444-4444-4444-4444-444444444444';
const POST_E = '55555555-5555-5555-5555-555555555555';

function queue(
  pgn: unknown[],
  embed: unknown[],
  image: unknown[],
  fen: unknown[],
  video: unknown[]
) {
  queueRows.push(pgn, embed, image, fen, video);
}

describe('getAttachmentsForPosts — 5-kind union', () => {
  it('returns an empty Map when no postIds are passed', async () => {
    const result = await getAttachmentsForPosts([]);
    expect(result.size).toBe(0);
  });

  it('emits one entry per post for each of the 5 kinds (no conflicts)', async () => {
    queue(
      [
        {
          id: 'pgn-1',
          postId: POST_A,
          source: 'pgn',
          sourceUrl: null,
          sourceGameId: null,
          pgn: '<pgn>',
          moveCount: 1,
          headerWhite: null,
          headerBlack: null,
          headerResult: null,
          headerEvent: null,
          headerSite: null,
          headerDate: null,
          anonymized: false,
          attributionPlatform: null,
          attributionPath: null,
        },
      ],
      [
        {
          id: 'embed-1',
          postId: POST_B,
          embedProvider: 'lichess',
          embedId: 'abcd1234',
          attributionPlatform: 'lichess',
          attributionPath: '/abcd1234',
        },
      ],
      [
        {
          id: 'img-1',
          postId: POST_C,
          storagePath: 'u/p/r1.jpg',
          width: 100,
          height: 80,
          altText: 'one',
          displayOrder: 0,
        },
        {
          id: 'img-2',
          postId: POST_C,
          storagePath: 'u/p/r2.jpg',
          width: 100,
          height: 80,
          altText: null,
          displayOrder: 1,
        },
      ],
      [
        {
          id: 'fen-1',
          postId: POST_D,
          fen: '8/8/8/8/4k3/8/4K3/8 w - - 0 1',
          caption: 'KK endgame',
        },
      ],
      [
        {
          id: 'vid-1',
          postId: POST_E,
          provider: 'youtube',
          providerVideoId: 'dQw4w9WgXcQ',
          title: null,
        },
      ]
    );

    const result = await getAttachmentsForPosts([POST_A, POST_B, POST_C, POST_D, POST_E]);

    expect(result.size).toBe(5);
    expect(result.get(POST_A)?.kind).toBe('pgn');
    expect(result.get(POST_B)?.kind).toBe('embed');
    expect(result.get(POST_C)?.kind).toBe('image');
    expect(result.get(POST_D)?.kind).toBe('fen');
    expect(result.get(POST_E)?.kind).toBe('video');

    const imageEntry = result.get(POST_C) as Extract<PostAttachment, { kind: 'image' }>;
    expect(imageEntry.data.length).toBe(2);
    expect(imageEntry.data[0].id).toBe('img-1');
    expect(imageEntry.data[0].publicUrl).toContain(
      'https://supabase.test/storage/v1/object/public/post-images/u/p/r1.jpg'
    );
    expect(imageEntry.data[1].id).toBe('img-2');

    expect(sentryWarn).not.toHaveBeenCalled();
  });

  it('preserves preference order pgn > embed > image > fen > video on conflict', async () => {
    // POST_A has rows in ALL FIVE tables. The aggregator must pick PGN
    // and warn 4 times (embed, image, fen, video each lose to PGN).
    queue(
      [
        {
          id: 'pgn-x',
          postId: POST_A,
          source: 'pgn',
          sourceUrl: null,
          sourceGameId: null,
          pgn: '<pgn>',
          moveCount: 1,
          headerWhite: null,
          headerBlack: null,
          headerResult: null,
          headerEvent: null,
          headerSite: null,
          headerDate: null,
          anonymized: false,
          attributionPlatform: null,
          attributionPath: null,
        },
      ],
      [
        {
          id: 'embed-x',
          postId: POST_A,
          embedProvider: 'lichess',
          embedId: 'abcd1234',
          attributionPlatform: 'lichess',
          attributionPath: '/abcd1234',
        },
      ],
      [
        {
          id: 'img-x',
          postId: POST_A,
          storagePath: 'u/p/r.jpg',
          width: 10,
          height: 10,
          altText: null,
          displayOrder: 0,
        },
      ],
      [
        {
          id: 'fen-x',
          postId: POST_A,
          fen: '8/8/8/8/4k3/8/4K3/8 w - - 0 1',
          caption: null,
        },
      ],
      [
        {
          id: 'vid-x',
          postId: POST_A,
          provider: 'youtube',
          providerVideoId: 'dQw4w9WgXcQ',
          title: null,
        },
      ]
    );

    const result = await getAttachmentsForPosts([POST_A]);
    expect(result.size).toBe(1);
    expect(result.get(POST_A)?.kind).toBe('pgn');
    expect(sentryWarn).toHaveBeenCalledTimes(4);
  });

  it('prefers image over fen and over video', async () => {
    queue(
      [],
      [],
      [
        {
          id: 'img-y',
          postId: POST_A,
          storagePath: 'u/p/r.jpg',
          width: 10,
          height: 10,
          altText: null,
          displayOrder: 0,
        },
      ],
      [
        {
          id: 'fen-y',
          postId: POST_A,
          fen: '8/8/8/8/4k3/8/4K3/8 w - - 0 1',
          caption: null,
        },
      ],
      [
        {
          id: 'vid-y',
          postId: POST_A,
          provider: 'youtube',
          providerVideoId: 'dQw4w9WgXcQ',
          title: null,
        },
      ]
    );
    const result = await getAttachmentsForPosts([POST_A]);
    expect(result.get(POST_A)?.kind).toBe('image');
    expect(sentryWarn).toHaveBeenCalledTimes(2);
  });

  it('orders multiple images for the same post by displayOrder', async () => {
    queue(
      [],
      [],
      [
        {
          id: 'i0',
          postId: POST_A,
          storagePath: 'u/p/a.jpg',
          width: 1,
          height: 1,
          altText: null,
          displayOrder: 0,
        },
        {
          id: 'i1',
          postId: POST_A,
          storagePath: 'u/p/b.jpg',
          width: 1,
          height: 1,
          altText: null,
          displayOrder: 1,
        },
        {
          id: 'i2',
          postId: POST_A,
          storagePath: 'u/p/c.jpg',
          width: 1,
          height: 1,
          altText: null,
          displayOrder: 2,
        },
      ],
      [],
      []
    );
    const result = await getAttachmentsForPosts([POST_A]);
    const entry = result.get(POST_A) as Extract<PostAttachment, { kind: 'image' }>;
    expect(entry.kind).toBe('image');
    expect(entry.data.map((d) => d.displayOrder)).toEqual([0, 1, 2]);
  });
});
