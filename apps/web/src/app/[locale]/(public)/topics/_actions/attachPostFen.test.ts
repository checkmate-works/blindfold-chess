import { beforeEach, describe, expect, it, vi } from 'vitest';

import { attachPostFen } from './attachPostFen';

const mockGetUser = vi.fn();
const mockSelectWhere = vi.fn();
const mockInsertValues = vi.fn();
const mockInsertReturning = vi.fn();
const mockIsUserBanned = vi.fn();
const mockCheckRateLimit = vi.fn();

vi.mock('@/lib/users/activity-log');

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

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
  postFenAttachments: {
    id: 'id',
    postId: 'post_id',
    fen: 'fen',
    caption: 'caption',
    createdAt: 'created_at',
  },
  topicPosts: {
    id: 'id',
    userId: 'user_id',
    topicType: 'topic_type',
    topicKey: 'topic_key',
    deletedAt: 'deleted_at',
  },
}));

vi.mock('@/lib/moderation/ban', () => ({
  isUserBanned: (...args: unknown[]) => mockIsUserBanned(...args),
}));

vi.mock('@/lib/security/rate-limit', () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
  RATE_LIMITS: {
    attachPostFen: { action: 'attach_post_fen', maxAttempts: 10, windowMs: 3_600_000 },
  },
}));

const userId = 'user-00000000-0000-0000-0000-000000000001';
const otherUserId = 'user-00000000-0000-0000-0000-000000000002';
const postId = '00000000-0000-0000-0000-00000000aaaa';
const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUser.mockResolvedValue({ data: { user: { id: userId } } });
  mockIsUserBanned.mockResolvedValue(false);
  mockCheckRateLimit.mockResolvedValue({ allowed: true });
  mockSelectWhere.mockReturnValue([
    { id: postId, userId, topicType: 'opening', topicKey: 'sicilian', deletedAt: null },
  ]);
  mockInsertReturning.mockResolvedValue([
    {
      id: 'attach-id',
      fen: STARTING_FEN,
      caption: null,
      createdAt: new Date('2026-05-04T07:00:00Z'),
    },
  ]);
});

describe('attachPostFen — happy path', () => {
  it('attaches a valid FEN with no caption', async () => {
    const result = await attachPostFen({ postId, fen: STARTING_FEN });
    expect(result).toEqual({
      success: true,
      attachment: {
        id: 'attach-id',
        fen: STARTING_FEN,
        caption: null,
        createdAt: new Date('2026-05-04T07:00:00Z'),
      },
    });
    // Confirm the INSERT was called with the right shape — explicitly NOT
    // returning postId in the response.
    expect(mockInsertValues).toHaveBeenCalledWith({
      postId,
      fen: STARTING_FEN,
      caption: null,
    });
  });

  it('persists a sanitized caption (Trojan Source / zero-width strip)', async () => {
    const dirtyCaption = `evil${String.fromCharCode(0x202e)}cap${String.fromCharCode(0x200b)}tion`;
    mockInsertReturning.mockResolvedValue([
      {
        id: 'attach-id',
        fen: STARTING_FEN,
        caption: 'evilcaption',
        createdAt: new Date('2026-05-04T07:00:00Z'),
      },
    ]);

    const result = await attachPostFen({
      postId,
      fen: STARTING_FEN,
      caption: dirtyCaption,
    });

    expect(result).toMatchObject({ success: true });
    expect(mockInsertValues).toHaveBeenCalledWith({
      postId,
      fen: STARTING_FEN,
      caption: 'evilcaption',
    });
  });

  it('attaches a valid FEN with explicit null caption', async () => {
    // Distinct from the no-caption happy-path: the caller may pass
    // `caption: null` explicitly, and the action should insert null
    // (not undefined) without rejecting.
    const result = await attachPostFen({ postId, fen: STARTING_FEN, caption: null });
    expect(result).toMatchObject({ success: true });
    expect(mockInsertValues).toHaveBeenCalledWith({
      postId,
      fen: STARTING_FEN,
      caption: null,
    });
  });

  it('stores null when caption is ONLY invisible / bidi characters', async () => {
    // Sanitizer strips every codepoint, leaves an empty string, returns
    // null. The action accepts the FEN and persists `caption: null` — it
    // does NOT reject, because the caption is optional.
    const onlyBidi =
      String.fromCharCode(0x202e) + String.fromCharCode(0x200b) + String.fromCharCode(0xfeff);
    mockInsertReturning.mockResolvedValue([
      {
        id: 'attach-id',
        fen: STARTING_FEN,
        caption: null,
        createdAt: new Date('2026-05-04T07:00:00Z'),
      },
    ]);

    const result = await attachPostFen({
      postId,
      fen: STARTING_FEN,
      caption: onlyBidi,
    });

    expect(result).toMatchObject({ success: true });
    expect(mockInsertValues).toHaveBeenCalledWith({
      postId,
      fen: STARTING_FEN,
      caption: null,
    });
  });
});

describe('attachPostFen — input validation', () => {
  it('rejects empty FEN with fenRequired', async () => {
    const result = await attachPostFen({ postId, fen: '' });
    expect(result).toEqual({ error: 'postFenAttachment.error.fenRequired' });
  });

  it('rejects FEN longer than 100 chars with fenTooLong', async () => {
    const result = await attachPostFen({ postId, fen: 'x'.repeat(101) });
    expect(result).toEqual({ error: 'postFenAttachment.error.fenTooLong' });
  });

  it('rejects malformed FEN with invalidFenStructure', async () => {
    const result = await attachPostFen({ postId, fen: 'not a fen' });
    expect(result).toEqual({ error: 'postFenAttachment.error.invalidFenStructure' });
  });

  it('rejects semantically illegal FEN (no kings) with invalidFenSemantic', async () => {
    const result = await attachPostFen({
      postId,
      fen: '8/8/8/8/8/8/8/8 w - - 0 1',
    });
    expect(result).toEqual({ error: 'postFenAttachment.error.invalidFenSemantic' });
  });

  it('rejects semantically illegal FEN (pawn on rank 8) with invalidFenSemantic', async () => {
    const result = await attachPostFen({
      postId,
      fen: 'P3k3/8/8/8/8/8/8/4K3 w - - 0 1',
    });
    expect(result).toEqual({ error: 'postFenAttachment.error.invalidFenSemantic' });
  });

  it('canonicalizes FEN with trailing whitespace before validate and insert', async () => {
    // The validator internally trims, but the DB CHECK regex is
    // anchored. Trim canonicalization at the action level keeps both
    // paths consistent and avoids a confusing 23514 leak.
    const result = await attachPostFen({
      postId,
      fen: `${STARTING_FEN}   `,
    });
    expect(result).toMatchObject({ success: true });
    expect(mockInsertValues).toHaveBeenCalledWith({
      postId,
      fen: STARTING_FEN,
      caption: null,
    });
  });

  it('canonicalizes FEN with leading whitespace before validate and insert', async () => {
    const result = await attachPostFen({
      postId,
      fen: `\t  ${STARTING_FEN}`,
    });
    expect(result).toMatchObject({ success: true });
    expect(mockInsertValues).toHaveBeenCalledWith({
      postId,
      fen: STARTING_FEN,
      caption: null,
    });
  });

  it('rejects whitespace-only FEN with fenRequired (post-trim empty)', async () => {
    const result = await attachPostFen({ postId, fen: '   \t\n' });
    expect(result).toEqual({ error: 'postFenAttachment.error.fenRequired' });
  });

  it('rejects FEN with trailing zero-width space (U+200B) as invalidFenStructure', async () => {
    // String.prototype.trim() does NOT strip U+200B, and `\s+` does not
    // match it either, so the appended ZWSP survives canonicalization
    // and ends up as part of the last FEN field, failing the structural
    // regex. Pin this behavior so a future "trim more aggressively"
    // change is forced to confront it intentionally.
    const result = await attachPostFen({
      postId,
      fen: `${STARTING_FEN}\u200B`,
    });
    expect(result).toEqual({ error: 'postFenAttachment.error.invalidFenStructure' });
    expect(mockInsertValues).not.toHaveBeenCalled();
  });

  it('accepts FEN whose RAW length exceeds 100 if the TRIMMED length fits', async () => {
    // The fix-pass ordering trims first, then length-checks the trimmed
    // value. ` `.repeat(150) + STARTING_FEN is 206 chars raw but only
    // 56 chars after trim, so the action should succeed and the
    // persisted value should be the canonical STARTING_FEN.
    const padded = ' '.repeat(150) + STARTING_FEN;
    const result = await attachPostFen({ postId, fen: padded });
    expect(result).toMatchObject({ success: true });
    expect(mockInsertValues).toHaveBeenCalledWith({
      postId,
      fen: STARTING_FEN,
      caption: null,
    });
  });

  it('rejects caption longer than 200 chars with captionTooLong', async () => {
    const result = await attachPostFen({
      postId,
      fen: STARTING_FEN,
      caption: 'x'.repeat(201),
    });
    expect(result).toEqual({ error: 'postFenAttachment.error.captionTooLong' });
  });
});

describe('attachPostFen — auth / ownership', () => {
  it('returns signInRequired when user is unauthenticated', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const result = await attachPostFen({ postId, fen: STARTING_FEN });
    expect(result).toEqual({ error: 'signInRequired' });
  });

  it('returns banned when user is banned', async () => {
    mockIsUserBanned.mockResolvedValueOnce(true);
    const result = await attachPostFen({ postId, fen: STARTING_FEN });
    expect(result).toEqual({ error: 'banned' });
  });

  it('returns postNotFound when post does not exist', async () => {
    mockSelectWhere.mockReturnValueOnce([]);
    const result = await attachPostFen({ postId, fen: STARTING_FEN });
    expect(result).toEqual({ error: 'postFenAttachment.error.postNotFound' });
  });

  it('returns notOwner when post belongs to another user', async () => {
    mockSelectWhere.mockReturnValueOnce([{ id: postId, userId: otherUserId, deletedAt: null }]);
    const result = await attachPostFen({ postId, fen: STARTING_FEN });
    expect(result).toEqual({ error: 'postFenAttachment.error.notOwner' });
  });

  it('returns postNotFound when post is soft-deleted', async () => {
    mockSelectWhere.mockReturnValueOnce([{ id: postId, userId, deletedAt: new Date() }]);
    const result = await attachPostFen({ postId, fen: STARTING_FEN });
    expect(result).toEqual({ error: 'postFenAttachment.error.postNotFound' });
  });
});

describe('attachPostFen — DB error mapping', () => {
  it('maps unique-violation (23505) to alreadyAttached', async () => {
    const err = Object.assign(new Error('duplicate'), { code: '23505' });
    mockInsertReturning.mockRejectedValueOnce(err);

    const result = await attachPostFen({ postId, fen: STARTING_FEN });
    expect(result).toEqual({ error: 'postFenAttachment.error.alreadyAttached' });
  });

  it('maps check-violation (23514) to invalidFenStructure', async () => {
    const err = Object.assign(new Error('check_violation'), { code: '23514' });
    mockInsertReturning.mockRejectedValueOnce(err);

    const result = await attachPostFen({ postId, fen: STARTING_FEN });
    expect(result).toEqual({ error: 'postFenAttachment.error.invalidFenStructure' });
  });

  it('maps string-data-right-truncation (22001) to fenTooLong', async () => {
    // Defense-in-depth: app-layer length pre-checks should normally
    // catch this case before the INSERT, but if a value slips through
    // (e.g. column shrunk via migration) we still surface a structured
    // user-facing error rather than rethrowing.
    const err = Object.assign(new Error('value too long'), { code: '22001' });
    mockInsertReturning.mockRejectedValueOnce(err);

    const result = await attachPostFen({ postId, fen: STARTING_FEN });
    expect(result).toEqual({ error: 'postFenAttachment.error.fenTooLong' });
  });

  it('rethrows unknown DB errors', async () => {
    const err = new Error('oops');
    mockInsertReturning.mockRejectedValueOnce(err);

    await expect(attachPostFen({ postId, fen: STARTING_FEN })).rejects.toThrow('oops');
  });
});

describe('attachPostFen — edit-flow side effects', () => {
  // Attaching neither writes an activity-log row (the attachment row itself
  // survives in post_fen_attachments) nor revalidates: the topic page is
  // dynamic, and `AttachmentAddButton` calls `router.refresh()` on success.
  it('writes no activity-log row and revalidates nothing', async () => {
    const { logActivityEvent } = await import('@/lib/users/activity-log');
    const { revalidatePath } = await import('next/cache');

    await attachPostFen({ postId, fen: STARTING_FEN });

    expect(logActivityEvent).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
