import { beforeEach, describe, expect, it, vi } from 'vitest';

import { attachPostVideo } from './attachPostVideo';

const mockGetUser = vi.fn();
const mockSelectWhere = vi.fn();
const mockInsertValues = vi.fn();
const mockInsertReturning = vi.fn();
const mockIsUserBanned = vi.fn();
const mockCheckRateLimit = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: () =>
    Promise.resolve({
      auth: {
        getUser: mockGetUser,
      },
    }),
}));

vi.mock('@/lib/db', () => ({
  db: {
    select: () => ({
      from: () => ({
        where: (...args: unknown[]) => {
          mockSelectWhere(...args);
          return {
            limit: () =>
              mockSelectWhere.mock.results[mockSelectWhere.mock.calls.length - 1]?.value ?? [],
          };
        },
      }),
    }),
    insert: () => ({
      values: (...args: unknown[]) => {
        mockInsertValues(...args);
        return {
          returning: () => mockInsertReturning(),
        };
      },
    }),
  },
  postVideoAttachments: {
    id: 'id',
    postId: 'post_id',
    provider: 'provider',
    providerVideoId: 'provider_video_id',
    sourceUrl: 'source_url',
    title: 'title',
    thumbnailUrl: 'thumbnail_url',
    createdAt: 'created_at',
  },
  topicPosts: {
    id: 'id',
    userId: 'user_id',
    deletedAt: 'deleted_at',
  },
}));

vi.mock('@/lib/moderation/ban', () => ({
  isUserBanned: (...args: unknown[]) => mockIsUserBanned(...args),
}));

vi.mock('@/lib/security/rate-limit', () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
  RATE_LIMITS: {
    attachPostVideo: { action: 'attach_post_video', maxAttempts: 10, windowMs: 3_600_000 },
  },
}));

const userId = 'user-00000000-0000-0000-0000-000000000001';
const otherUserId = 'user-00000000-0000-0000-0000-000000000002';
const postId = '00000000-0000-0000-0000-00000000aaaa';
const VALID_ID = 'VALIDID0001';
const VALID_URL = `https://www.youtube.com/watch?v=${VALID_ID}`;

beforeEach(() => {
  mockGetUser.mockResolvedValue({ data: { user: { id: userId } } });
  mockIsUserBanned.mockResolvedValue(false);
  mockCheckRateLimit.mockResolvedValue({ allowed: true });
  mockSelectWhere.mockReturnValue([{ id: postId, userId, deletedAt: null }]);
  mockInsertReturning.mockResolvedValue([
    {
      id: 'attach-id',
      provider: 'youtube',
      providerVideoId: VALID_ID,
      sourceUrl: VALID_URL,
      title: null,
      thumbnailUrl: null,
      createdAt: new Date('2026-05-04T08:00:00Z'),
    },
  ]);
});

describe('attachPostVideo — happy path', () => {
  it('attaches a valid YouTube watch URL', async () => {
    const result = await attachPostVideo({ postId, url: VALID_URL });
    expect(result).toEqual({
      success: true,
      attachment: {
        id: 'attach-id',
        provider: 'youtube',
        providerVideoId: VALID_ID,
        sourceUrl: VALID_URL,
        title: null,
        thumbnailUrl: null,
        createdAt: new Date('2026-05-04T08:00:00Z'),
      },
    });
    // Confirm INSERT shape — explicit fields, no leaked column names
    // and no postId echoed back to caller.
    expect(mockInsertValues).toHaveBeenCalledWith({
      postId,
      provider: 'youtube',
      providerVideoId: VALID_ID,
      sourceUrl: VALID_URL,
    });
  });

  it('accepts a youtu.be short URL with tracking params', async () => {
    const url = `https://youtu.be/${VALID_ID}?si=trackingjunk`;
    const result = await attachPostVideo({ postId, url });
    expect(result).toMatchObject({ success: true });
    expect(mockInsertValues).toHaveBeenCalledWith({
      postId,
      provider: 'youtube',
      providerVideoId: VALID_ID,
      sourceUrl: url,
    });
  });

  it('canonicalizes URL with surrounding whitespace before parse and insert', async () => {
    // Mirrors the FEN trim divergence pin (Lessons §10): trim once at
    // the top so parser, INSERT, and length pre-check all see the same
    // canonical value.
    const result = await attachPostVideo({
      postId,
      url: `   ${VALID_URL}   `,
    });
    expect(result).toMatchObject({ success: true });
    expect(mockInsertValues).toHaveBeenCalledWith({
      postId,
      provider: 'youtube',
      providerVideoId: VALID_ID,
      sourceUrl: VALID_URL,
    });
  });
});

describe('attachPostVideo — input validation', () => {
  it('rejects empty URL with urlRequired', async () => {
    const result = await attachPostVideo({ postId, url: '' });
    expect(result).toEqual({ error: 'postVideoAttachment.error.urlRequired' });
  });

  it('rejects whitespace-only URL with urlRequired (post-trim empty)', async () => {
    const result = await attachPostVideo({ postId, url: '   \t\n' });
    expect(result).toEqual({ error: 'postVideoAttachment.error.urlRequired' });
  });

  it('rejects URL longer than 512 chars with inputTooLong', async () => {
    const long = 'a'.repeat(513);
    const result = await attachPostVideo({ postId, url: long });
    expect(result).toEqual({ error: 'postVideoAttachment.error.inputTooLong' });
  });
});

describe('attachPostVideo — auth / ownership', () => {
  it('returns signInRequired when user is unauthenticated', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const result = await attachPostVideo({ postId, url: VALID_URL });
    expect(result).toEqual({ error: 'signInRequired' });
  });

  it('returns banned when user is banned', async () => {
    mockIsUserBanned.mockResolvedValueOnce(true);
    const result = await attachPostVideo({ postId, url: VALID_URL });
    expect(result).toEqual({ error: 'banned' });
  });

  it('returns postNotFound when post does not exist', async () => {
    mockSelectWhere.mockReturnValueOnce([]);
    const result = await attachPostVideo({ postId, url: VALID_URL });
    expect(result).toEqual({ error: 'postVideoAttachment.error.postNotFound' });
  });

  it('returns notOwner when post belongs to another user', async () => {
    mockSelectWhere.mockReturnValueOnce([{ id: postId, userId: otherUserId, deletedAt: null }]);
    const result = await attachPostVideo({ postId, url: VALID_URL });
    expect(result).toEqual({ error: 'postVideoAttachment.error.notOwner' });
  });

  it('returns postNotFound when post is soft-deleted', async () => {
    mockSelectWhere.mockReturnValueOnce([{ id: postId, userId, deletedAt: new Date() }]);
    const result = await attachPostVideo({ postId, url: VALID_URL });
    expect(result).toEqual({ error: 'postVideoAttachment.error.postNotFound' });
  });
});

describe('attachPostVideo — URL parser reason → error key mapping', () => {
  it('maps protocol_not_https to protocolNotHttps', async () => {
    const result = await attachPostVideo({
      postId,
      url: `http://www.youtube.com/watch?v=${VALID_ID}`,
    });
    expect(result).toEqual({ error: 'postVideoAttachment.error.protocolNotHttps' });
  });

  it('maps host_not_allowed to hostNotAllowed', async () => {
    const result = await attachPostVideo({
      postId,
      url: `https://evil.tld/watch?v=${VALID_ID}`,
    });
    expect(result).toEqual({ error: 'postVideoAttachment.error.hostNotAllowed' });
  });

  it('maps userinfo_present to userinfoPresent', async () => {
    const result = await attachPostVideo({
      postId,
      url: `https://user:pass@www.youtube.com/watch?v=${VALID_ID}`,
    });
    expect(result).toEqual({ error: 'postVideoAttachment.error.userinfoPresent' });
  });

  it('maps fragment_not_allowed to fragmentNotAllowed', async () => {
    const result = await attachPostVideo({
      postId,
      url: `https://www.youtube.com/watch?v=${VALID_ID}#evil`,
    });
    expect(result).toEqual({ error: 'postVideoAttachment.error.fragmentNotAllowed' });
  });

  it('maps pathname_not_supported to pathnameNotSupported', async () => {
    const result = await attachPostVideo({
      postId,
      url: 'https://www.youtube.com/playlist?list=PLxxx',
    });
    expect(result).toEqual({ error: 'postVideoAttachment.error.pathnameNotSupported' });
  });

  it('maps param_pollution to paramPollution', async () => {
    const result = await attachPostVideo({
      postId,
      url: `https://www.youtube.com/watch?v=${VALID_ID}&v=EVILID00002`,
    });
    expect(result).toEqual({ error: 'postVideoAttachment.error.paramPollution' });
  });

  it('maps invalid_id to invalidId', async () => {
    const result = await attachPostVideo({
      postId,
      url: 'https://www.youtube.com/watch?v=SHORT001',
    });
    expect(result).toEqual({ error: 'postVideoAttachment.error.invalidId' });
  });

  it('maps invalid_url to invalidUrl', async () => {
    const result = await attachPostVideo({
      postId,
      url: 'not even a url',
    });
    expect(result).toEqual({ error: 'postVideoAttachment.error.invalidUrl' });
  });
});

describe('attachPostVideo — DB error mapping (extractPgErrorCode)', () => {
  it('maps unique-violation (23505) to alreadyAttached', async () => {
    const err = Object.assign(new Error('duplicate'), { code: '23505' });
    mockInsertReturning.mockRejectedValueOnce(err);

    const result = await attachPostVideo({ postId, url: VALID_URL });
    expect(result).toEqual({ error: 'postVideoAttachment.error.alreadyAttached' });
  });

  it('maps check-violation (23514) to invalidVideoStructure', async () => {
    const err = Object.assign(new Error('check_violation'), { code: '23514' });
    mockInsertReturning.mockRejectedValueOnce(err);

    const result = await attachPostVideo({ postId, url: VALID_URL });
    expect(result).toEqual({ error: 'postVideoAttachment.error.invalidVideoStructure' });
  });

  it('maps string-data-right-truncation (22001) to tooLong', async () => {
    const err = Object.assign(new Error('value too long'), { code: '22001' });
    mockInsertReturning.mockRejectedValueOnce(err);

    const result = await attachPostVideo({ postId, url: VALID_URL });
    expect(result).toEqual({ error: 'postVideoAttachment.error.tooLong' });
  });

  it('extracts SQLSTATE from err.cause when wrapped by Drizzle', async () => {
    // `extractPgErrorCode` walks `err.cause` per its TSDoc. Pin that
    // the action uses the canonical helper and not a local reimpl that
    // misses the cause walk (Lessons §11).
    const cause = Object.assign(new Error('underlying'), { code: '23505' });
    const wrapper = new Error('wrapper');
    (wrapper as Error & { cause?: unknown }).cause = cause;
    mockInsertReturning.mockRejectedValueOnce(wrapper);

    const result = await attachPostVideo({ postId, url: VALID_URL });
    expect(result).toEqual({ error: 'postVideoAttachment.error.alreadyAttached' });
  });

  it('rethrows unknown DB errors', async () => {
    const err = new Error('oops');
    mockInsertReturning.mockRejectedValueOnce(err);

    await expect(attachPostVideo({ postId, url: VALID_URL })).rejects.toThrow('oops');
  });
});
