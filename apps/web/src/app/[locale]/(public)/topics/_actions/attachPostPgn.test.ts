import { describe, expect, it, vi } from 'vitest';

import { isUserBanned as mockIsUserBanned } from '@/lib/moderation/__mocks__/ban';
import { getUserMock as mockGetUser } from '@/lib/supabase/__mocks__/server';
import { logActivityEvent } from '@/lib/users/activity-log';

import { attachPostPgn } from './attachPostPgn';

const mockSelectLimit = vi.fn();
const mockInsertReturning = vi.fn();
const mockBuildValues = vi.fn();

vi.mock('@/lib/users/activity-log');

vi.mock('@/lib/supabase/server');

vi.mock('@/lib/db', () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: () => mockSelectLimit(),
        }),
      }),
    }),
    insert: () => ({
      values: () => ({
        returning: () => mockInsertReturning(),
      }),
    }),
  },
  topicPosts: {
    id: 'id',
    userId: 'user_id',
    topicType: 'topic_type',
    topicKey: 'topic_key',
    deletedAt: 'deleted_at',
  },
  postGamePgnAttachments: {
    id: 'id',
    createdAt: 'created_at',
  },
}));

vi.mock('@/lib/games/build-pgn-attachment-values', () => ({
  buildPgnAttachmentValues: (...args: unknown[]) => mockBuildValues(...args),
  pgnAttachmentErrorKey: (key: string) => `attachment.error.${key}`,
}));

vi.mock('@/lib/moderation/ban');

vi.mock('@/lib/security/rate-limit');

const testUserId = 'user-00000000-0000-0000-0000-000000000001';
const otherUserId = 'user-00000000-0000-0000-0000-000000000002';
const testPostId = 'post-00000000-0000-0000-0000-000000000001';
const testAttachmentId = 'attach-00000000-0000-0000-0000-000000000001';

const ownedPostRow = {
  id: testPostId,
  userId: testUserId,
  topicType: 'opening',
  topicKey: 'sicilian-defense',
  deletedAt: null,
};

function fdWithAttachment(value: string, anonymize?: 'on'): FormData {
  const fd = new FormData();
  fd.set('attachment', value);
  if (anonymize) fd.set('attachmentAnonymize', anonymize);
  return fd;
}

const validatedValues = {
  source: 'pgn' as const,
  sourceUrl: null,
  sourceGameId: null,
  pgn: '1. e4 e5',
  pgnByteLength: 8,
  startingFen: null,
  moveCount: 2,
  headerWhite: null,
  headerBlack: null,
  headerResult: null,
  headerEvent: null,
  headerSite: null,
  headerDate: null,
  anonymized: false,
  attributionPlatform: null,
  attributionPath: null,
};

describe('attachPostPgn', () => {
  it('returns signInRequired when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const result = await attachPostPgn(testPostId, 'en', fdWithAttachment('1. e4 e5'));
    expect(result).toEqual({ error: 'signInRequired' });
  });

  it('returns banned when user is banned', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
    mockIsUserBanned.mockResolvedValue(true);
    const result = await attachPostPgn(testPostId, 'en', fdWithAttachment('1. e4 e5'));
    expect(result).toEqual({ error: 'banned' });
  });

  it('returns notFound when post does not exist', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
    mockIsUserBanned.mockResolvedValue(false);
    mockSelectLimit.mockResolvedValueOnce([]);
    const result = await attachPostPgn(testPostId, 'en', fdWithAttachment('1. e4 e5'));
    expect(result).toEqual({ error: 'notFound' });
  });

  it('returns unauthorized when user does not own the post', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
    mockIsUserBanned.mockResolvedValue(false);
    mockSelectLimit.mockResolvedValueOnce([{ ...ownedPostRow, userId: otherUserId }]);
    const result = await attachPostPgn(testPostId, 'en', fdWithAttachment('1. e4 e5'));
    expect(result).toEqual({ error: 'unauthorized' });
  });

  it('returns alreadyDeleted when post is soft-deleted', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
    mockIsUserBanned.mockResolvedValue(false);
    mockSelectLimit.mockResolvedValueOnce([{ ...ownedPostRow, deletedAt: new Date() }]);
    const result = await attachPostPgn(testPostId, 'en', fdWithAttachment('1. e4 e5'));
    expect(result).toEqual({ error: 'alreadyDeleted' });
  });

  it('rejects empty attachment input before validation', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
    mockIsUserBanned.mockResolvedValue(false);
    mockSelectLimit.mockResolvedValueOnce([ownedPostRow]);

    const result = await attachPostPgn(testPostId, 'en', fdWithAttachment('   '));
    expect(result).toEqual({ error: 'attachment.error.empty' });
    expect(mockBuildValues).not.toHaveBeenCalled();
  });

  it('returns the pipeline error when buildPgnAttachmentValues fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
    mockIsUserBanned.mockResolvedValue(false);
    mockSelectLimit.mockResolvedValueOnce([ownedPostRow]);
    mockBuildValues.mockResolvedValueOnce({ ok: false, error: 'invalid_pgn' });

    const result = await attachPostPgn(testPostId, 'en', fdWithAttachment('garbage'));
    expect(result).toEqual({ error: 'attachment.error.invalid_pgn' });
    expect(mockInsertReturning).not.toHaveBeenCalled();
  });

  it('inserts the validated values (without writing an activity-log row)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
    mockIsUserBanned.mockResolvedValue(false);
    mockSelectLimit.mockResolvedValueOnce([ownedPostRow]);
    mockBuildValues.mockResolvedValueOnce({ ok: true, values: validatedValues });
    const createdAt = new Date('2026-05-11T10:00:00Z');
    mockInsertReturning.mockResolvedValueOnce([{ id: testAttachmentId, createdAt }]);

    const result = await attachPostPgn(testPostId, 'en', fdWithAttachment('1. e4 e5'));
    expect(result).toEqual({
      success: true,
      attachment: { id: testAttachmentId, createdAt },
    });
    // The PGN attachment row survives in post_game_pgn_attachments, so
    // attaching is not duplicated into the activity log.
    expect(logActivityEvent).not.toHaveBeenCalled();
  });

  it('maps a Postgres unique-violation to alreadyAttached', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
    mockIsUserBanned.mockResolvedValue(false);
    mockSelectLimit.mockResolvedValueOnce([ownedPostRow]);
    mockBuildValues.mockResolvedValueOnce({ ok: true, values: validatedValues });
    const dupErr = new Error('duplicate key') as Error & { code?: string };
    dupErr.code = '23505';
    mockInsertReturning.mockRejectedValueOnce(dupErr);

    const result = await attachPostPgn(testPostId, 'en', fdWithAttachment('1. e4 e5'));
    expect(result).toEqual({ error: 'alreadyAttached' });
  });
});
