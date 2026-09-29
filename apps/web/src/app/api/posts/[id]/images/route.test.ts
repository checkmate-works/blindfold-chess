import { NextResponse } from 'next/server';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { POST } from './route';

const mocks = vi.hoisted(() => ({
  guard: vi.fn(),
  lookup: vi.fn(),
  upload: vi.fn(),
  remove: vi.fn(),
  insert: vi.fn(),
  normalize: vi.fn(),
}));

vi.mock('@/lib/api-mutation-guard', () => ({ guardApiMutation: mocks.guard }));
vi.mock('@/lib/topic-posts', () => ({ loadAuthoredPost: mocks.lookup }));
vi.mock('@/lib/security/rate-limit', () => ({ RATE_LIMITS: { uploadPostImage: {} } }));
vi.mock('@sentry/nextjs', () => ({ captureException: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({
  createClient: () => {
    throw new Error('Session clients must not write images');
  },
}));
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    storage: {
      from: () => ({
        upload: mocks.upload,
        remove: mocks.remove,
        getPublicUrl: () => ({ data: { publicUrl: 'https://example.com/image.webp' } }),
      }),
    },
  }),
}));
vi.mock('@/lib/db', () => ({
  postImageAttachments: {},
  db: { insert: () => ({ values: () => ({ returning: mocks.insert }) }) },
}));
vi.mock('@/lib/post-images/sharp-helpers', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/post-images/sharp-helpers')>()),
  probeImageDimensions: async () => ({ width: 100, height: 100 }),
  normalizePostImageBuffer: mocks.normalize,
}));

const userId = '11111111-1111-4111-8111-111111111111';
const postId = '22222222-2222-4222-8222-222222222222';
const processed = Buffer.from('processed-webp');
const params = { params: Promise.resolve({ id: postId }) };

function request(bytes = [0xff, 0xd8, 0xff]) {
  const file = new File([new Uint8Array(bytes)], 'image.jpg', { type: 'image/jpeg' });
  // jsdom's File lacks arrayBuffer; keep the real File identity and supply
  // the browser method so the route still exercises its signature check.
  Object.defineProperty(file, 'arrayBuffer', {
    value: async () => new Uint8Array(bytes).buffer,
  });
  const form = new FormData();
  form.set('file', file);
  return { headers: new Headers(), formData: async () => form } as Request;
}

beforeEach(() => {
  mocks.guard.mockResolvedValue({ user: { id: userId } });
  mocks.lookup.mockResolvedValue({ post: { id: postId } });
  mocks.normalize.mockResolvedValue(processed);
  mocks.upload.mockResolvedValue({ error: null });
  mocks.remove.mockResolvedValue({ error: null });
  mocks.insert.mockResolvedValue([{ id: 'image-id', postId }]);
});

describe('privileged post-image storage', () => {
  it('uploads only processed bytes under the authenticated owner after validation', async () => {
    expect((await POST(request(), params)).status).toBe(201);
    expect(mocks.lookup).toHaveBeenCalledWith(postId, userId);
    expect(mocks.upload).toHaveBeenCalledWith(
      expect.stringMatching(new RegExp(`^${userId}/${postId}/[0-9a-f-]+\\.webp$`)),
      processed,
      { contentType: 'image/webp', upsert: false }
    );
  });

  it('rejects a foreign post before privileged storage access', async () => {
    mocks.lookup.mockResolvedValue({ error: 'unauthorized' });
    expect((await POST(request(), params)).status).toBe(403);
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it('rejects forged JPEG metadata before decoding or storage access', async () => {
    expect(
      (await POST(request([0, 0, 0, 24, 102, 116, 121, 112, 97, 118, 105, 102]), params)).status
    ).toBe(400);
    expect(mocks.normalize).not.toHaveBeenCalled();
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it('rejects banned callers before storage access', async () => {
    mocks.guard.mockResolvedValue({
      response: NextResponse.json({ error: 'banned' }, { status: 403 }),
    });
    expect((await POST(request(), params)).status).toBe(403);
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it('removes the uploaded object if the database rejects the attachment', async () => {
    mocks.insert.mockRejectedValue(new Error('post_image_count_exceeded'));
    expect((await POST(request(), params)).status).toBe(409);
    expect(mocks.remove).toHaveBeenCalledWith([mocks.upload.mock.calls[0][0]]);
  });
});
