import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MAX_CONTENT_LENGTH } from '@/lib/validations/content';

const mockAuthenticateAndGuard = vi.fn();
const mockInsertGameComment = vi.fn();
const mockGetGameCommentAuthorId = vi.fn();
const mockEditGameComment = vi.fn();
const mockGetLiveGameAuthorId = vi.fn();

vi.mock('@/lib/auth', () => ({
  authenticateGuardAndRequireProfile: (...args: unknown[]) => mockAuthenticateAndGuard(...args),
}));

vi.mock('@/lib/db/game-comments', () => ({
  GAME_COMMENT_LIKE_TARGET: 'game_comment',
  editGameComment: (...args: unknown[]) => mockEditGameComment(...args),
  getGameCommentAuthorId: (...args: unknown[]) => mockGetGameCommentAuthorId(...args),
  getGameCommentParent: vi.fn(),
  getGameCommentTarget: vi.fn(),
  insertGameComment: (...args: unknown[]) => mockInsertGameComment(...args),
  softDeleteGameComment: vi.fn(),
}));

vi.mock('@/lib/db/games-read', () => ({
  getLiveGameAuthorId: (...args: unknown[]) => mockGetLiveGameAuthorId(...args),
}));

vi.mock('@/lib/db/like-actions', () => ({
  performEntityToggleLike: vi.fn(),
}));

vi.mock('@/lib/moderation/block');

vi.mock('@/lib/notifications/notification');

vi.mock('@/lib/security/rate-limit');

vi.mock('@/lib/server-action-error', () => ({
  handleServerActionError: () => ({ success: false, error: 'unexpected_error' }),
}));

const CALLER = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const OWNER = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const GAME_ID = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
const COMMENT_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

// Loaded once at module scope rather than inside each `it`: pulling this
// graph costs a few hundred milliseconds, and inside a test body that cost is
// charged to vitest's 5s `testTimeout`, which the first test can cross when
// the suite is competing for CPU. Later tests hit the module cache, so the
// symptom is one flaky test rather than a slow file. The `vi.mock` calls
// above are hoisted over this statement, so the load needs no per-test setup.
const { addGameCommentAction, editGameCommentAction } = await import('./game-comments');

describe('addGameCommentAction body validation', () => {
  beforeEach(() => {
    mockAuthenticateAndGuard.mockResolvedValue({ user: { id: CALLER } });
    mockGetLiveGameAuthorId.mockResolvedValue(OWNER);
    mockInsertGameComment.mockResolvedValue({
      id: COMMENT_ID,
      createdAt: new Date('2026-07-30T00:00:00Z'),
      updatedAt: new Date('2026-07-30T00:00:00Z'),
    });
  });

  it('rejects a whitespace-only body as invalid_body', async () => {
    const result = await addGameCommentAction({ gameId: GAME_ID, ply: null, body: '   ' });

    expect(result).toEqual({ success: false, error: 'invalid_body' });
    expect(mockInsertGameComment).not.toHaveBeenCalled();
  });

  it('rejects a body whose trimmed length exceeds MAX_CONTENT_LENGTH as invalid_body', async () => {
    const result = await addGameCommentAction({
      gameId: GAME_ID,
      ply: null,
      body: 'a'.repeat(MAX_CONTENT_LENGTH + 1),
    });

    expect(result).toEqual({ success: false, error: 'invalid_body' });
    expect(mockInsertGameComment).not.toHaveBeenCalled();
  });

  // Same rule as every other body surface: the limit is measured after
  // trimming, because the trimmed value is what gets stored.
  it('accepts 1998 characters followed by five spaces and stores the trimmed body', async () => {
    const body = 'a'.repeat(1998);
    const result = await addGameCommentAction({ gameId: GAME_ID, ply: 3, body: `${body}     ` });

    expect(result).toMatchObject({ success: true, id: COMMENT_ID });
    expect(mockInsertGameComment).toHaveBeenCalledWith(expect.objectContaining({ body }));
  });
});

describe('editGameCommentAction body validation', () => {
  beforeEach(() => {
    mockAuthenticateAndGuard.mockResolvedValue({ user: { id: CALLER } });
    mockGetGameCommentAuthorId.mockResolvedValue(CALLER);
    mockEditGameComment.mockResolvedValue({ updatedAt: new Date('2026-07-30T00:00:00Z') });
  });

  it('rejects a body whose trimmed length exceeds MAX_CONTENT_LENGTH as invalid_body', async () => {
    const result = await editGameCommentAction(COMMENT_ID, 'a'.repeat(MAX_CONTENT_LENGTH + 1));

    expect(result).toEqual({ success: false, error: 'invalid_body' });
    expect(mockEditGameComment).not.toHaveBeenCalled();
  });

  it('accepts 1998 characters followed by five spaces and stores the trimmed body', async () => {
    const body = 'a'.repeat(1998);
    const result = await editGameCommentAction(COMMENT_ID, `${body}     `);

    expect(result).toEqual({ success: true, updatedAt: '2026-07-30T00:00:00.000Z' });
    expect(mockEditGameComment).toHaveBeenCalledWith(COMMENT_ID, body);
  });
});
