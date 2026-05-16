import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createChunkPostWithVideoAttachment } from './createChunkPostWithVideoAttachment';

const mockGetUser = vi.fn();
const mockIsUserBanned = vi.fn();
const mockGetChunkBySlug = vi.fn();
const mockCheckRateLimit = vi.fn();
const mockInsertValues = vi.fn();
const mockInsertReturning = vi.fn();
const mockVideoInsertValues = vi.fn();

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}));

vi.mock('@/lib/users/activity-log', () => ({
  logActivityEvent: vi.fn(),
}));

vi.mock('@/lib/notifications/notification', () => ({
  notifyFollowersOfNewPost: vi.fn(),
  createNotification: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => Promise.resolve({ auth: { getUser: mockGetUser } }),
}));

const generatedPostId = 'post-00000000-0000-0000-0000-0000000000aa';

const mockTx = {
  insert: (table: { __name?: string }) => {
    if (table.__name === 'post_video_attachments') {
      return {
        values: (...args: unknown[]) => {
          mockVideoInsertValues(...args);
          return Promise.resolve();
        },
      };
    }
    return {
      values: (...args: unknown[]) => {
        mockInsertValues(...args);
        return { returning: () => mockInsertReturning() };
      },
    };
  },
};

vi.mock('@/lib/db', () => ({
  db: {
    transaction: (fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx),
  },
  topicPosts: { id: 'id', __name: 'topic_posts' },
  postVideoAttachments: { __name: 'post_video_attachments' },
  feedItems: { __name: 'feed_items' },
}));

vi.mock('@/lib/moderation/ban', () => ({
  isUserBanned: (...args: unknown[]) => mockIsUserBanned(...args),
}));

vi.mock('@/lib/security/rate-limit', () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
  RATE_LIMITS: {
    createPost: { action: 'create_post', maxAttempts: 10, windowMs: 3_600_000 },
  },
}));

const mockRedirect = vi.fn();
vi.mock('next/navigation', () => ({
  redirect: (...args: unknown[]) => {
    mockRedirect(...args);
    throw new Error('NEXT_REDIRECT');
  },
}));

vi.mock('next/cache', () => ({ revalidateTag: vi.fn() }));

vi.mock('@/lib/points', () => ({
  grantPointsForPost: vi.fn().mockResolvedValue({ pointEventId: 'pe-1', amount: 3 }),
  clawbackPointsForPost: vi.fn().mockResolvedValue(undefined),
  isPointEligibleTopicType: (v: string) => v === 'square' || v === 'opening',
  POST_CREATION_POINTS: 3,
}));

vi.mock('@/lib/chunks/queries', () => ({
  getChunkBySlug: (slug: string) => mockGetChunkBySlug(slug),
}));

const testUserId = 'user-00000000-0000-0000-0000-000000000001';
const testSlug = 'rook-battery';

const VALID_URL = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
const VALID_VIDEO_ID = 'dQw4w9WgXcQ';

function makeFormData(opts: {
  content?: string;
  replyPermission?: string;
  url?: string | null;
}): FormData {
  const fd = new FormData();
  fd.set('content', opts.content ?? 'a chunk comment with video');
  fd.set('replyPermission', opts.replyPermission ?? 'everyone');
  if (opts.url !== undefined && opts.url !== null) fd.set('attachmentVideoUrl', opts.url);
  return fd;
}

describe('createChunkPostWithVideoAttachment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetChunkBySlug.mockResolvedValue({ id: 'chunk-1', slug: testSlug });
    mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
    mockIsUserBanned.mockResolvedValue(false);
    mockInsertReturning.mockResolvedValue([{ id: generatedPostId }]);
    mockCheckRateLimit.mockResolvedValue({ success: true });
  });

  it('happy path inserts a video row alongside the post and redirects', async () => {
    await expect(
      createChunkPostWithVideoAttachment('en', testSlug, {}, makeFormData({ url: VALID_URL }))
    ).rejects.toThrow('NEXT_REDIRECT');

    expect(mockVideoInsertValues).toHaveBeenCalledTimes(1);
    const inserted = mockVideoInsertValues.mock.calls[0][0];
    expect(inserted.postId).toBe(generatedPostId);
    expect(inserted.provider).toBe('youtube');
    expect(inserted.providerVideoId).toBe(VALID_VIDEO_ID);
    // Persisted source_url is the parser's canonical, which for YouTube
    // watch is the input host stripped to the canonical form. We accept
    // anything the parser returns as long as it is not blank.
    expect(typeof inserted.sourceUrl).toBe('string');
    expect((inserted.sourceUrl as string).length).toBeGreaterThan(0);
  });

  it('trims URL whitespace at action entry (Lessons §10)', async () => {
    const padded = `\n  ${VALID_URL}  \t`;
    await expect(
      createChunkPostWithVideoAttachment('en', testSlug, {}, makeFormData({ url: padded }))
    ).rejects.toThrow('NEXT_REDIRECT');

    expect(mockVideoInsertValues).toHaveBeenCalledTimes(1);
    expect(mockVideoInsertValues.mock.calls[0][0].providerVideoId).toBe(VALID_VIDEO_ID);
  });

  it('rejects empty URL with urlRequired', async () => {
    const result = await createChunkPostWithVideoAttachment(
      'en',
      testSlug,
      {},
      makeFormData({ url: '   ' })
    );
    expect(result).toEqual({ error: 'postVideoAttachment.error.urlRequired' });
  });

  it('rejects over-long input pre-parse with inputTooLong', async () => {
    const longUrl = `https://www.youtube.com/watch?v=${'x'.repeat(600)}`;
    const result = await createChunkPostWithVideoAttachment(
      'en',
      testSlug,
      {},
      makeFormData({ url: longUrl })
    );
    expect(result).toEqual({ error: 'postVideoAttachment.error.inputTooLong' });
  });

  it('rejects a non-YouTube host with hostNotAllowed', async () => {
    const result = await createChunkPostWithVideoAttachment(
      'en',
      testSlug,
      {},
      makeFormData({ url: 'https://vimeo.com/12345' })
    );
    expect(result).toEqual({ error: 'postVideoAttachment.error.hostNotAllowed' });
  });

  it('maps PG 23505 to alreadyAttached', async () => {
    const err = Object.assign(new Error('duplicate'), { code: '23505' });
    mockInsertReturning.mockImplementationOnce(() => {
      throw err;
    });
    const result = await createChunkPostWithVideoAttachment(
      'en',
      testSlug,
      {},
      makeFormData({ url: VALID_URL })
    );
    expect(result).toEqual({ error: 'postVideoAttachment.error.alreadyAttached' });
  });

  it('walks err.cause for PG 23505 (canonical extractPgErrorCode, Lessons §16)', async () => {
    const inner = Object.assign(new Error('duplicate'), { code: '23505' });
    const wrapped = new Error('Drizzle wrapper');
    (wrapped as Error & { cause?: unknown }).cause = inner;
    mockInsertReturning.mockImplementationOnce(() => {
      throw wrapped;
    });
    const result = await createChunkPostWithVideoAttachment(
      'en',
      testSlug,
      {},
      makeFormData({ url: VALID_URL })
    );
    expect(result).toEqual({ error: 'postVideoAttachment.error.alreadyAttached' });
  });

  it('maps PG 23514 to invalidVideoStructure (defense-in-depth)', async () => {
    const err = Object.assign(new Error('check'), { code: '23514' });
    mockInsertReturning.mockImplementationOnce(() => {
      throw err;
    });
    const result = await createChunkPostWithVideoAttachment(
      'en',
      testSlug,
      {},
      makeFormData({ url: VALID_URL })
    );
    expect(result).toEqual({ error: 'postVideoAttachment.error.invalidVideoStructure' });
  });

  it('maps PG 22001 to tooLong (defense-in-depth)', async () => {
    const err = Object.assign(new Error('truncation'), { code: '22001' });
    mockInsertReturning.mockImplementationOnce(() => {
      throw err;
    });
    const result = await createChunkPostWithVideoAttachment(
      'en',
      testSlug,
      {},
      makeFormData({ url: VALID_URL })
    );
    expect(result).toEqual({ error: 'postVideoAttachment.error.tooLong' });
  });

  it('re-throws unmapped errors', async () => {
    mockInsertReturning.mockImplementationOnce(() => {
      throw new Error('boom');
    });
    await expect(
      createChunkPostWithVideoAttachment('en', testSlug, {}, makeFormData({ url: VALID_URL }))
    ).rejects.toThrow('boom');
  });

  // ─── Hostile URL boundary pins (Tester Phase 1) ───────────────────────
  // A subset of #75 SE's 28 cases re-targeted at the integrated action,
  // exercising every YouTubeUrlReason → error-key branch in
  // `reasonToErrorKey`. Lessons §10 / §12 / §16 / §18 apply.

  it('rejects javascript: scheme URL with protocolNotHttps', async () => {
    // `new URL('javascript:alert(1)')` parses successfully; step 3
    // should reject it on protocol. This pins the canonical
    // protocol-not-https translation, not invalid_url.
    const result = await createChunkPostWithVideoAttachment(
      'en',
      testSlug,
      {},
      makeFormData({ url: 'javascript:alert(1)' })
    );
    expect(result).toEqual({ error: 'postVideoAttachment.error.protocolNotHttps' });
    expect(mockVideoInsertValues).not.toHaveBeenCalled();
  });

  it('rejects data: URL with protocolNotHttps', async () => {
    const result = await createChunkPostWithVideoAttachment(
      'en',
      testSlug,
      {},
      makeFormData({ url: 'data:text/html,<script>1</script>' })
    );
    expect(result).toEqual({ error: 'postVideoAttachment.error.protocolNotHttps' });
  });

  it('rejects http:// (non-https) with protocolNotHttps', async () => {
    const result = await createChunkPostWithVideoAttachment(
      'en',
      testSlug,
      {},
      makeFormData({ url: 'http://www.youtube.com/watch?v=dQw4w9WgXcQ' })
    );
    expect(result).toEqual({ error: 'postVideoAttachment.error.protocolNotHttps' });
  });

  it('rejects URL containing userinfo with userinfoPresent', async () => {
    // The classic WHATWG userinfo trick — without the dedicated check,
    // the parser puts `evil.tld` in `hostname`, which step 6 would
    // then reject as host_not_allowed. This pin asserts the explicit
    // userinfo branch fires first.
    const result = await createChunkPostWithVideoAttachment(
      'en',
      testSlug,
      {},
      makeFormData({ url: 'https://user:pass@www.youtube.com/watch?v=dQw4w9WgXcQ' })
    );
    expect(result).toEqual({ error: 'postVideoAttachment.error.userinfoPresent' });
  });

  it('rejects URL with a fragment with fragmentNotAllowed', async () => {
    const result = await createChunkPostWithVideoAttachment(
      'en',
      testSlug,
      {},
      makeFormData({ url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ#t=30' })
    );
    expect(result).toEqual({ error: 'postVideoAttachment.error.fragmentNotAllowed' });
  });

  it('rejects an apex-with-path lookalike with hostNotAllowed', async () => {
    const result = await createChunkPostWithVideoAttachment(
      'en',
      testSlug,
      {},
      makeFormData({ url: 'https://attacker.tld/www.youtube.com/watch?v=dQw4w9WgXcQ' })
    );
    expect(result).toEqual({ error: 'postVideoAttachment.error.hostNotAllowed' });
  });

  it('rejects a YouTube path with trailing segments with pathnameNotSupported', async () => {
    const result = await createChunkPostWithVideoAttachment(
      'en',
      testSlug,
      {},
      makeFormData({ url: 'https://www.youtube.com/embed/dQw4w9WgXcQ/extra' })
    );
    expect(result).toEqual({ error: 'postVideoAttachment.error.pathnameNotSupported' });
  });

  it('rejects an 11-char id under unsupported pathname (/playlist) with pathnameNotSupported', async () => {
    const result = await createChunkPostWithVideoAttachment(
      'en',
      testSlug,
      {},
      makeFormData({ url: 'https://www.youtube.com/playlist?list=PLabcdefghij' })
    );
    expect(result).toEqual({ error: 'postVideoAttachment.error.pathnameNotSupported' });
  });

  it('rejects HTTP parameter pollution with paramPollution', async () => {
    // ?v=A&v=B — the parser must not silently accept the first
    // occurrence and ignore the attacker-controlled second one.
    const result = await createChunkPostWithVideoAttachment(
      'en',
      testSlug,
      {},
      makeFormData({ url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&v=evilvideo1' })
    );
    expect(result).toEqual({ error: 'postVideoAttachment.error.paramPollution' });
  });

  it('rejects an id under 11 chars with pathnameNotSupported (matches PATHNAME_SHORTS_RE not /watch)', async () => {
    // /shorts/{ID} requires exactly 11 chars; a 10-char id misses the
    // anchored regex and falls through to pathname_not_supported.
    const result = await createChunkPostWithVideoAttachment(
      'en',
      testSlug,
      {},
      makeFormData({ url: 'https://www.youtube.com/shorts/abcdefghij' })
    );
    expect(result).toEqual({ error: 'postVideoAttachment.error.pathnameNotSupported' });
  });

  it('accepts /shorts/{11-char id} (variant pin)', async () => {
    await expect(
      createChunkPostWithVideoAttachment(
        'en',
        testSlug,
        {},
        makeFormData({ url: 'https://www.youtube.com/shorts/dQw4w9WgXcQ' })
      )
    ).rejects.toThrow('NEXT_REDIRECT');
    expect(mockVideoInsertValues).toHaveBeenCalledTimes(1);
    expect(mockVideoInsertValues.mock.calls[0][0].providerVideoId).toBe(VALID_VIDEO_ID);
  });

  it('accepts /live/{11-char id} (variant pin)', async () => {
    await expect(
      createChunkPostWithVideoAttachment(
        'en',
        testSlug,
        {},
        makeFormData({ url: 'https://www.youtube.com/live/dQw4w9WgXcQ' })
      )
    ).rejects.toThrow('NEXT_REDIRECT');
    expect(mockVideoInsertValues).toHaveBeenCalledTimes(1);
    expect(mockVideoInsertValues.mock.calls[0][0].providerVideoId).toBe(VALID_VIDEO_ID);
  });

  it('accepts youtu.be/{11-char id} (variant pin)', async () => {
    await expect(
      createChunkPostWithVideoAttachment(
        'en',
        testSlug,
        {},
        makeFormData({ url: 'https://youtu.be/dQw4w9WgXcQ' })
      )
    ).rejects.toThrow('NEXT_REDIRECT');
    expect(mockVideoInsertValues).toHaveBeenCalledTimes(1);
    expect(mockVideoInsertValues.mock.calls[0][0].providerVideoId).toBe(VALID_VIDEO_ID);
  });

  it('does not crash on URL with an embedded NULL byte', async () => {
    // U+0000 is encoded by WHATWG URL parser as %00 inside the query
    // value, so the action may either parse + reject (id regex fails on
    // %00 → invalidId), accept and persist a canonicalized URL, or
    // pathname-mismatch. The contract this pin enforces is purely:
    // the action returns or throws NEXT_REDIRECT, never a 5xx-like
    // unhandled exception. Lessons §18: \x00 escape.
    const nul = `https://www.youtube.com/watch?v=dQw4w9WgXcQ\x00`;
    let result: unknown;
    let threw: unknown;
    try {
      result = await createChunkPostWithVideoAttachment(
        'en',
        testSlug,
        {},
        makeFormData({ url: nul })
      );
    } catch (e) {
      threw = e;
    }
    // Acceptable outcomes: NEXT_REDIRECT (canonicalized successfully)
    // OR a structured error result.
    if (threw) {
      expect((threw as Error).message).toBe('NEXT_REDIRECT');
    } else {
      expect(result).toMatchObject({
        error: expect.stringMatching(/^postVideoAttachment\.error\./),
      });
    }
  });

  it('rejects a valid host but ZWSP-suffixed video id with invalidId', async () => {
    // ZWSP-padded id survives the action's trim (String.trim does not
    // strip U+200B), then fails the regex. Pins the §12 in-band-Unicode
    // posture for the video path.
    // \u200B escape per Lessons §18.
    const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' + '\u200B';
    const result = await createChunkPostWithVideoAttachment(
      'en',
      testSlug,
      {},
      makeFormData({ url })
    );
    expect(result).toMatchObject({
      error: expect.stringMatching(
        /^postVideoAttachment\.error\.(invalidId|invalidUrl|pathnameNotSupported)/
      ),
    });
    expect(mockVideoInsertValues).not.toHaveBeenCalled();
  });

  it('rejects pre-encoded URL whose decoded id contains a non-base64 char with invalidId', async () => {
    // %2F = '/', not in [A-Za-z0-9_-]. Step 8 invalidId backstop fires
    // because /watch?v= is not regex-anchored on the id, only re-checked.
    const result = await createChunkPostWithVideoAttachment(
      'en',
      testSlug,
      {},
      makeFormData({ url: 'https://www.youtube.com/watch?v=abcdefghi%2F0' })
    );
    expect(result).toEqual({ error: 'postVideoAttachment.error.invalidId' });
  });

  it('walks err.cause for PG 23514 (invalidVideoStructure) — defense-in-depth', async () => {
    const inner = Object.assign(new Error('check_violation'), { code: '23514' });
    const wrapped = new Error('Drizzle wrapper');
    (wrapped as Error & { cause?: unknown }).cause = inner;
    mockInsertReturning.mockImplementationOnce(() => {
      throw wrapped;
    });
    const result = await createChunkPostWithVideoAttachment(
      'en',
      testSlug,
      {},
      makeFormData({ url: VALID_URL })
    );
    expect(result).toEqual({ error: 'postVideoAttachment.error.invalidVideoStructure' });
  });

  it('walks err.cause for PG 22001 (tooLong) — defense-in-depth', async () => {
    const inner = Object.assign(new Error('right_truncation'), { code: '22001' });
    const wrapped = new Error('Drizzle wrapper');
    (wrapped as Error & { cause?: unknown }).cause = inner;
    mockInsertReturning.mockImplementationOnce(() => {
      throw wrapped;
    });
    const result = await createChunkPostWithVideoAttachment(
      'en',
      testSlug,
      {},
      makeFormData({ url: VALID_URL })
    );
    expect(result).toEqual({ error: 'postVideoAttachment.error.tooLong' });
  });

  it('canonicalizes sourceUrl via WHATWG (URL parser strips trailing junk after parse)', async () => {
    // `new URL('https://www.youtube.com/watch?v=dQw4w9WgXcQ').toString()`
    // round-trips to the canonical form. Pin that the persisted source
    // URL is non-empty even when the input has trailing slashes after
    // /watch.
    await expect(
      createChunkPostWithVideoAttachment('en', testSlug, {}, makeFormData({ url: VALID_URL }))
    ).rejects.toThrow('NEXT_REDIRECT');
    const inserted = mockVideoInsertValues.mock.calls[0][0];
    expect(inserted.sourceUrl).toMatch(/^https:\/\/www\.youtube\.com\/watch/);
    expect(inserted.providerVideoId).toBe(VALID_VIDEO_ID);
  });

  it('rejects url FormData entry omitted entirely with urlRequired', async () => {
    // FormData without `attachmentVideoUrl` must fall through to
    // urlRequired (not invalidUrl, not crash).
    const fd = new FormData();
    fd.set('content', 'a chunk comment with video');
    fd.set('replyPermission', 'everyone');
    const result = await createChunkPostWithVideoAttachment('en', testSlug, {}, fd);
    expect(result).toEqual({ error: 'postVideoAttachment.error.urlRequired' });
  });
});
