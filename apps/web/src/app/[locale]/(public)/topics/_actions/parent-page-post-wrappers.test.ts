import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getPositionById } from '@/lib/positions/queries';
import { getRepertoireById } from '@/lib/repertoires/queries';
import { RATE_LIMITS } from '@/lib/security/rate-limit';
import { validateContent } from '@/lib/validations/content';

import { createPositionMemoryPostForImageAttach } from '@/app/[locale]/(public)/practice/(free-play)/position-memory/[id]/_actions/createPositionMemoryPostForImageAttach';
import { createPositionMemoryPostWithAttachment } from '@/app/[locale]/(public)/practice/(free-play)/position-memory/[id]/_actions/createPositionMemoryPostWithAttachment';
import { createPositionMemoryPostWithFenAttachment } from '@/app/[locale]/(public)/practice/(free-play)/position-memory/[id]/_actions/createPositionMemoryPostWithFenAttachment';
import { createPositionPuzzlePostForImageAttach } from '@/app/[locale]/(public)/practice/(free-play)/puzzle/[id]/_actions/createPositionPuzzlePostForImageAttach';
import { createPositionPuzzlePostWithAttachment } from '@/app/[locale]/(public)/practice/(free-play)/puzzle/[id]/_actions/createPositionPuzzlePostWithAttachment';
import { createPositionPuzzlePostWithFenAttachment } from '@/app/[locale]/(public)/practice/(free-play)/puzzle/[id]/_actions/createPositionPuzzlePostWithFenAttachment';
import { createRepertoirePostForImageAttach } from '@/app/[locale]/(public)/repertoires/[id]/_actions/createRepertoirePostForImageAttach';
import { createRepertoirePostWithAttachment } from '@/app/[locale]/(public)/repertoires/[id]/_actions/createRepertoirePostWithAttachment';
import { createRepertoirePostWithFenAttachment } from '@/app/[locale]/(public)/repertoires/[id]/_actions/createRepertoirePostWithFenAttachment';

import { createPostForImageAttachBase } from './createPost';
import { createPostWithAttachmentBase } from './createPostWithAttachmentBase';
import { createPostWithFenAttachmentBase } from './createPostWithFenAttachmentBase';

vi.mock('@/lib/positions/queries', () => ({ getPositionById: vi.fn() }));
vi.mock('@/lib/repertoires/queries', () => ({ getRepertoireById: vi.fn() }));
vi.mock('./createPost', () => ({ createPostForImageAttachBase: vi.fn() }));
vi.mock('./createPostWithAttachmentBase', () => ({ createPostWithAttachmentBase: vi.fn() }));
vi.mock('./createPostWithFenAttachmentBase', () => ({ createPostWithFenAttachmentBase: vi.fn() }));

const flows = [
  {
    name: 'createRepertoirePostWithAttachment',
    topicType: 'repertoire',
    urlSegment: 'repertoires',
    spoiler: true,
    image: false,
    core: vi.mocked(createPostWithAttachmentBase),
    run: (formData: FormData) =>
      createRepertoirePostWithAttachment('ja', 'parent-id', {}, formData),
  },
  {
    name: 'createRepertoirePostWithFenAttachment',
    topicType: 'repertoire',
    urlSegment: 'repertoires',
    spoiler: true,
    image: false,
    core: vi.mocked(createPostWithFenAttachmentBase),
    run: (formData: FormData) =>
      createRepertoirePostWithFenAttachment('ja', 'parent-id', {}, formData),
  },
  {
    name: 'createRepertoirePostForImageAttach',
    topicType: 'repertoire',
    urlSegment: 'repertoires',
    spoiler: true,
    image: true,
    core: vi.mocked(createPostForImageAttachBase),
    run: (formData: FormData) => createRepertoirePostForImageAttach('ja', 'parent-id', formData),
  },
  {
    name: 'createPositionPuzzlePostWithAttachment',
    topicType: 'position_puzzle',
    urlSegment: 'practice/puzzle',
    spoiler: true,
    image: false,
    core: vi.mocked(createPostWithAttachmentBase),
    run: (formData: FormData) =>
      createPositionPuzzlePostWithAttachment('ja', 'parent-id', {}, formData),
  },
  {
    name: 'createPositionPuzzlePostWithFenAttachment',
    topicType: 'position_puzzle',
    urlSegment: 'practice/puzzle',
    spoiler: true,
    image: false,
    core: vi.mocked(createPostWithFenAttachmentBase),
    run: (formData: FormData) =>
      createPositionPuzzlePostWithFenAttachment('ja', 'parent-id', {}, formData),
  },
  {
    name: 'createPositionPuzzlePostForImageAttach',
    topicType: 'position_puzzle',
    urlSegment: 'practice/puzzle',
    spoiler: true,
    image: true,
    core: vi.mocked(createPostForImageAttachBase),
    run: (formData: FormData) =>
      createPositionPuzzlePostForImageAttach('ja', 'parent-id', formData),
  },
  {
    name: 'createPositionMemoryPostWithAttachment',
    topicType: 'position_memory',
    urlSegment: 'practice/position-memory',
    spoiler: false,
    image: false,
    core: vi.mocked(createPostWithAttachmentBase),
    run: (formData: FormData) =>
      createPositionMemoryPostWithAttachment('ja', 'parent-id', {}, formData),
  },
  {
    name: 'createPositionMemoryPostWithFenAttachment',
    topicType: 'position_memory',
    urlSegment: 'practice/position-memory',
    spoiler: false,
    image: false,
    core: vi.mocked(createPostWithFenAttachmentBase),
    run: (formData: FormData) =>
      createPositionMemoryPostWithFenAttachment('ja', 'parent-id', {}, formData),
  },
  {
    name: 'createPositionMemoryPostForImageAttach',
    topicType: 'position_memory',
    urlSegment: 'practice/position-memory',
    spoiler: false,
    image: true,
    core: vi.mocked(createPostForImageAttachBase),
    run: (formData: FormData) =>
      createPositionMemoryPostForImageAttach('ja', 'parent-id', formData),
  },
];

describe.each(flows)('$name', ({ topicType, urlSegment, spoiler, image, core, run }) => {
  beforeEach(() => {
    vi.mocked(getRepertoireById).mockResolvedValue({ userId: 'author-id' } as never);
    vi.mocked(getPositionById).mockResolvedValue({ userId: 'author-id' } as never);
    core.mockResolvedValue({ error: 'core-result' });
  });

  it('passes the parent policy and attachment-specific redirect to the core', async () => {
    const formData = new FormData();
    formData.set('isSpoiler', 'on');
    expect(await run(formData)).toEqual({ error: 'core-result' });
    const params = core.mock.calls[0][0];
    expect(params).toMatchObject({
      locale: 'ja',
      topicType,
      urlSegment,
      topicIdentifier: 'parent-id',
      topicKey: 'parent-id',
      emitFeedItem: false,
      topicAuthorId: 'author-id',
      rateLimit: RATE_LIMITS.createPost,
      validateContent,
      formData,
    });
    expect(params.isSpoiler).toBe(spoiler ? true : undefined);
    expect(await params.validateTopic('parent-id')).toBe(true);
    if (image) expect(params.redirectPath).toBeUndefined();
    else
      expect(params.redirectPath?.('post-id')).toBe(
        `/ja/${urlSegment}/parent-id?toast=post_created#post-post-id`
      );
    if (topicType === 'repertoire') {
      expect(getRepertoireById).toHaveBeenCalledExactlyOnceWith('parent-id');
      expect(getPositionById).not.toHaveBeenCalled();
    } else {
      expect(getPositionById).toHaveBeenCalledExactlyOnceWith({
        id: 'parent-id',
        type: topicType === 'position_puzzle' ? 'puzzle' : 'memory',
      });
      expect(getRepertoireById).not.toHaveBeenCalled();
    }
  });

  it('rejects a missing parent through the existing core validation', async () => {
    vi.mocked(getRepertoireById).mockResolvedValue(null);
    vi.mocked(getPositionById).mockResolvedValue(null);
    await run(new FormData());
    const params = core.mock.calls[0][0];
    expect(await params.validateTopic('parent-id')).toBe(false);
    expect(params.invalidTopicError).toBe(
      topicType === 'repertoire' ? 'Invalid repertoire' : 'Invalid position'
    );
    expect(params.topicAuthorId).toBeUndefined();
  });

  it('keeps a parent whose author was deleted valid and does not invent a notification recipient', async () => {
    vi.mocked(getRepertoireById).mockResolvedValue({ userId: null } as never);
    vi.mocked(getPositionById).mockResolvedValue({ userId: null } as never);
    await run(new FormData());
    const params = core.mock.calls[0][0];
    expect(await params.validateTopic('parent-id')).toBe(true);
    expect(params.topicAuthorId).toBeNull();
    expect(params.isSpoiler).toBe(spoiler ? false : undefined);
  });
});
