import { describe, expect, it, vi } from 'vitest';

import { mockChain } from '@/lib/db/__test-support__/query-chain';
import { actualDbSchema } from '@/lib/db/__test-support__/schema-actual';

import { canUserReply, enforceReplyPermission } from './permissions';

vi.mock('@/lib/db', async () => {
  return {
    ...(await actualDbSchema()),
    db: { select: vi.fn() },
  };
});

const { db } = await import('@/lib/db');
const mockDb = vi.mocked(db);

const authorId = 'user-00000000-0000-0000-0000-000000000001';
const viewerId = 'user-00000000-0000-0000-0000-000000000002';

/** The next `userFollows` lookup finds a follow row (the viewer follows the author). */
function viewerFollowsAuthor() {
  const chain = mockChain([{ id: 'follow-1' }]);
  mockDb.select.mockReturnValue(chain as unknown as ReturnType<typeof mockDb.select>);
}

/** The next `userFollows` lookup comes back empty (no follow relationship). */
function viewerDoesNotFollowAuthor() {
  const chain = mockChain([]);
  mockDb.select.mockReturnValue(chain as unknown as ReturnType<typeof mockDb.select>);
}

const everyPermission = ['everyone', 'followers', 'nobody'] as const;

describe('canUserReply', () => {
  describe('signed-out viewer', () => {
    // Replying requires an account, so the answer is false whatever the post
    // allows. `followers` is the case that used to fall through to a trailing
    // `return true` and report a guest as able to reply.
    it.each(everyPermission)('is false on a %s post', async (replyPermission) => {
      viewerDoesNotFollowAuthor();

      const allowed = await canUserReply({
        userId: undefined,
        postUserId: authorId,
        replyPermission,
      });

      expect(allowed).toBe(false);
    });

    it('does not query the follow table — there is no follower to look up', async () => {
      viewerDoesNotFollowAuthor();

      await canUserReply({
        userId: undefined,
        postUserId: authorId,
        replyPermission: 'followers',
      });

      expect(mockDb.select).not.toHaveBeenCalled();
    });

    it('is false even on a post whose author was anonymised', async () => {
      const allowed = await canUserReply({
        userId: undefined,
        postUserId: null,
        replyPermission: 'everyone',
      });

      // `undefined === null` is false, so the viewer is not mistaken for the
      // purged author and does not inherit the author's blanket permission.
      expect(allowed).toBe(false);
    });
  });

  describe('signed-in viewer', () => {
    it('is true on an everyone post', async () => {
      const allowed = await canUserReply({
        userId: viewerId,
        postUserId: authorId,
        replyPermission: 'everyone',
      });

      expect(allowed).toBe(true);
    });

    it('is false on a nobody post', async () => {
      const allowed = await canUserReply({
        userId: viewerId,
        postUserId: authorId,
        replyPermission: 'nobody',
      });

      expect(allowed).toBe(false);
    });

    it('is false on a followers post when the viewer does not follow the author', async () => {
      viewerDoesNotFollowAuthor();

      const allowed = await canUserReply({
        userId: viewerId,
        postUserId: authorId,
        replyPermission: 'followers',
      });

      expect(allowed).toBe(false);
    });

    it('is true on a followers post when the viewer follows the author', async () => {
      viewerFollowsAuthor();

      const allowed = await canUserReply({
        userId: viewerId,
        postUserId: authorId,
        replyPermission: 'followers',
      });

      expect(allowed).toBe(true);
    });

    it('is false on a followers post whose author was anonymised', async () => {
      const allowed = await canUserReply({
        userId: viewerId,
        postUserId: null,
        replyPermission: 'followers',
      });

      // A purged author cannot be followed, so the gate is unsatisfiable and
      // no follow lookup is worth issuing.
      expect(allowed).toBe(false);
      expect(mockDb.select).not.toHaveBeenCalled();
    });
  });

  describe('post author', () => {
    it.each(everyPermission)('may always reply to their own %s post', async (replyPermission) => {
      const allowed = await canUserReply({
        userId: authorId,
        postUserId: authorId,
        replyPermission,
      });

      expect(allowed).toBe(true);
    });
  });
});

describe('enforceReplyPermission', () => {
  it('names the nobody gate as repliesDisabled', async () => {
    const result = await enforceReplyPermission(
      { userId: authorId, replyPermission: 'nobody' },
      viewerId
    );

    expect(result).toEqual({ error: 'repliesDisabled' });
  });

  it('names the followers gate as followRequired for a non-follower', async () => {
    viewerDoesNotFollowAuthor();

    const result = await enforceReplyPermission(
      { userId: authorId, replyPermission: 'followers' },
      viewerId
    );

    expect(result).toEqual({ error: 'followRequired' });
  });

  it('allows a follower through the followers gate', async () => {
    viewerFollowsAuthor();

    const result = await enforceReplyPermission(
      { userId: authorId, replyPermission: 'followers' },
      viewerId
    );

    expect(result).toBeNull();
  });

  it('allows the author through every gate', async () => {
    const results = await Promise.all(
      everyPermission.map((replyPermission) =>
        enforceReplyPermission({ userId: authorId, replyPermission }, authorId)
      )
    );

    expect(results).toEqual([null, null, null]);
  });
});

// The two entry points are one rule with two shapes. A thread that renders a
// reply box must be a thread `createReply` accepts, so for a signed-in viewer
// the boolean has to be exactly "no error".
describe('the read side and the write side agree', () => {
  it.each(everyPermission)('on a %s post, for a non-following viewer', async (replyPermission) => {
    viewerDoesNotFollowAuthor();
    const allowed = await canUserReply({
      userId: viewerId,
      postUserId: authorId,
      replyPermission,
    });

    viewerDoesNotFollowAuthor();
    const error = await enforceReplyPermission({ userId: authorId, replyPermission }, viewerId);

    expect(allowed).toBe(error === null);
  });

  it('on a followers post, for a following viewer', async () => {
    viewerFollowsAuthor();
    const allowed = await canUserReply({
      userId: viewerId,
      postUserId: authorId,
      replyPermission: 'followers',
    });

    viewerFollowsAuthor();
    const error = await enforceReplyPermission(
      { userId: authorId, replyPermission: 'followers' },
      viewerId
    );

    expect(allowed).toBe(error === null);
  });
});
