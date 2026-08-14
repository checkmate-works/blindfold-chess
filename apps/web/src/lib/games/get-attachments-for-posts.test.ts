import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getAttachmentsForPosts } from './get-attachments-for-posts';
import type { PostAttachment } from './get-attachments-for-posts';

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

  // ─── Boundary pins (Tester Phase 1) ───────────────────────────────────
  // Pairwise conflict pins not directly covered by the 5-way preferring
  // case + cardinality boundary pins for the image branch + an empty-row
  // sanity pin for posts with no attachments at all.

  it('returns no entry for a post with no rows in any of the 5 tables', async () => {
    queue([], [], [], [], []);
    const result = await getAttachmentsForPosts([POST_A]);
    // The contract shape is `Map<postId, PostAttachment>`; absence is
    // `map.get(id) === undefined`. PostCard / detail page already use
    // `map.get(id) ?? null` so pinning the absent-entry shape protects
    // that idiom against accidental "render an empty card" regressions.
    expect(result.size).toBe(0);
    expect(result.get(POST_A)).toBeUndefined();
    expect(sentryWarn).not.toHaveBeenCalled();
  });

  it('image cardinality 1: a single image row produces a one-element data array', async () => {
    queue(
      [],
      [],
      [
        {
          id: 'only',
          postId: POST_A,
          storagePath: 'u/p/only.jpg',
          width: 50,
          height: 50,
          altText: 'only one',
          displayOrder: 0,
        },
      ],
      [],
      []
    );
    const result = await getAttachmentsForPosts([POST_A]);
    const entry = result.get(POST_A) as Extract<PostAttachment, { kind: 'image' }>;
    expect(entry.kind).toBe('image');
    expect(entry.data.length).toBe(1);
    expect(entry.data[0].altText).toBe('only one');
  });

  it('image cardinality 3: three image rows for the same post produce one map entry, three data items', async () => {
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
    expect(result.size).toBe(1); // 3 image rows → 1 Map entry
    const entry = result.get(POST_A) as Extract<PostAttachment, { kind: 'image' }>;
    expect(entry.kind).toBe('image');
    expect(entry.data.length).toBe(3);
  });

  it('pgn vs image conflict: prefers pgn and warns once', async () => {
    queue(
      [
        {
          id: 'pgn-pi',
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
      [],
      [
        {
          id: 'img-pi',
          postId: POST_A,
          storagePath: 'u/p/r.jpg',
          width: 10,
          height: 10,
          altText: null,
          displayOrder: 0,
        },
      ],
      [],
      []
    );
    const result = await getAttachmentsForPosts([POST_A]);
    expect(result.get(POST_A)?.kind).toBe('pgn');
    expect(sentryWarn).toHaveBeenCalledTimes(1);
    // The warn payload identifies the dropped kind so we can grep it
    // in Sentry. Pin the message shape so a refactor doesn't silently
    // change it.
    const [msg] = sentryWarn.mock.calls[0];
    expect(msg).toMatch(/preferring pgn/);
  });

  it('embed vs fen conflict: prefers embed and warns once', async () => {
    queue(
      [],
      [
        {
          id: 'embed-ef',
          postId: POST_A,
          embedProvider: 'lichess',
          embedId: 'abcd1234',
          attributionPlatform: 'lichess',
          attributionPath: '/abcd1234',
        },
      ],
      [],
      [
        {
          id: 'fen-ef',
          postId: POST_A,
          fen: '8/8/8/8/4k3/8/4K3/8 w - - 0 1',
          caption: null,
        },
      ],
      []
    );
    const result = await getAttachmentsForPosts([POST_A]);
    expect(result.get(POST_A)?.kind).toBe('embed');
    expect(sentryWarn).toHaveBeenCalledTimes(1);
  });

  it('fen vs video conflict: prefers fen and warns once', async () => {
    queue(
      [],
      [],
      [],
      [
        {
          id: 'fen-fv',
          postId: POST_A,
          fen: '8/8/8/8/4k3/8/4K3/8 w - - 0 1',
          caption: null,
        },
      ],
      [
        {
          id: 'vid-fv',
          postId: POST_A,
          provider: 'youtube',
          providerVideoId: 'dQw4w9WgXcQ',
          title: null,
        },
      ]
    );
    const result = await getAttachmentsForPosts([POST_A]);
    expect(result.get(POST_A)?.kind).toBe('fen');
    expect(sentryWarn).toHaveBeenCalledTimes(1);
  });

  it('mixes attached and orphan posts: only posts with rows appear in the Map', async () => {
    // POST_A has a fen row; POST_B is requested but has nothing in any
    // of the 5 tables. Pin the contract that the Map is sparse.
    queue(
      [],
      [],
      [],
      [
        {
          id: 'fen-only',
          postId: POST_A,
          fen: '8/8/8/8/4k3/8/4K3/8 w - - 0 1',
          caption: null,
        },
      ],
      []
    );
    const result = await getAttachmentsForPosts([POST_A, POST_B]);
    expect(result.size).toBe(1);
    expect(result.get(POST_A)?.kind).toBe('fen');
    expect(result.get(POST_B)).toBeUndefined();
  });

  it('multiple images across different posts: each post gets its own entry', async () => {
    queue(
      [],
      [],
      [
        {
          id: 'a-1',
          postId: POST_A,
          storagePath: 'u/p/a1.jpg',
          width: 1,
          height: 1,
          altText: null,
          displayOrder: 0,
        },
        {
          id: 'b-1',
          postId: POST_B,
          storagePath: 'u/p/b1.jpg',
          width: 1,
          height: 1,
          altText: null,
          displayOrder: 0,
        },
        {
          id: 'b-2',
          postId: POST_B,
          storagePath: 'u/p/b2.jpg',
          width: 1,
          height: 1,
          altText: null,
          displayOrder: 1,
        },
      ],
      [],
      []
    );
    const result = await getAttachmentsForPosts([POST_A, POST_B]);
    expect(result.size).toBe(2);
    const aEntry = result.get(POST_A) as Extract<PostAttachment, { kind: 'image' }>;
    const bEntry = result.get(POST_B) as Extract<PostAttachment, { kind: 'image' }>;
    expect(aEntry.data.length).toBe(1);
    expect(bEntry.data.length).toBe(2);
  });

  it('image entry exposes a publicUrl built from the configured Supabase URL', async () => {
    // Pins that buildPostImagePublicUrl is invoked with the row's
    // storagePath and that the result follows the standard
    // /storage/v1/object/public/post-images/<path> shape.
    queue(
      [],
      [],
      [
        {
          id: 'pub-url',
          postId: POST_A,
          storagePath: 'user-1/post-2/abc.png',
          width: 1,
          height: 1,
          altText: null,
          displayOrder: 0,
        },
      ],
      [],
      []
    );
    const result = await getAttachmentsForPosts([POST_A]);
    const entry = result.get(POST_A) as Extract<PostAttachment, { kind: 'image' }>;
    expect(entry.data[0].publicUrl).toBe(
      'https://supabase.test/storage/v1/object/public/post-images/user-1/post-2/abc.png'
    );
  });

  it('exhaustiveness: PostAttachment.kind narrowing covers all 5 kinds (TS + runtime check)', () => {
    // Compile-time exhaustiveness pin (Lessons §13). If a new kind is
    // added to PostAttachment without updating this switch, the `_never`
    // assignment fails to compile. The runtime `expect(true)` keeps the
    // case visible in the suite output.
    const sample: PostAttachment[] = [
      { kind: 'pgn', data: {} as never },
      { kind: 'embed', data: {} as never },
      { kind: 'image', data: [] },
      { kind: 'fen', data: {} as never },
      { kind: 'video', data: {} as never },
    ];
    for (const a of sample) {
      switch (a.kind) {
        case 'pgn':
        case 'embed':
        case 'image':
        case 'fen':
        case 'video':
          break;
        default: {
          const _never: never = a;
          void _never;
        }
      }
    }
    expect(true).toBe(true);
  });
});
