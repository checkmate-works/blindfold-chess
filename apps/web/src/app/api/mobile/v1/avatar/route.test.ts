import { NextResponse } from 'next/server';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { authorizeMobileRequest } from '@/lib/mobile-api/auth';
import { RATE_LIMITS } from '@/lib/security/rate-limit';
import { clearAvatar, replaceAvatar } from '@/lib/users/avatar-update';

import { DELETE, POST } from './route';

vi.mock('@/lib/mobile-api/auth', () => ({ authorizeMobileRequest: vi.fn() }));
vi.mock('@/lib/users/avatar-update', () => ({
  replaceAvatar: vi.fn(),
  clearAvatar: vi.fn(),
}));

const USER = { id: 'user-1' };
const PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);

/** A jsdom `File` given the `arrayBuffer()` jsdom leaves out. */
function imageFile(bytes: Uint8Array, type: string): File {
  const file = new File([bytes as BlobPart], 'avatar', { type });
  if (typeof file.arrayBuffer !== 'function') {
    const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    Object.assign(file, { arrayBuffer: () => Promise.resolve(buffer) });
  }
  return file;
}

/**
 * A request whose `formData()` yields `file`. Under jsdom a real multipart
 * body does not round-trip into a `File` the gate accepts, so the method is
 * stubbed, as the web route's suite does.
 */
function uploadRequest(file?: File): Request {
  const form = { get: (name: string) => (name === 'file' ? (file ?? null) : null) };
  const request = new Request('https://example.test/api/mobile/v1/avatar', {
    method: 'POST',
    headers: { Authorization: 'Bearer token' },
  });
  return Object.assign(request, { formData: () => Promise.resolve(form) });
}

describe('POST /api/mobile/v1/avatar', () => {
  beforeEach(() => {
    vi.mocked(authorizeMobileRequest).mockResolvedValue({ ok: true, user: USER as never });
    vi.mocked(replaceAvatar).mockResolvedValue({ avatarUrl: 'https://cdn.test/a.webp?t=1' });
  });

  it('charges the web avatar upload budget', async () => {
    await POST(uploadRequest(imageFile(PNG_BYTES, 'image/png')));
    expect(authorizeMobileRequest).toHaveBeenCalledWith(expect.any(Request), {
      rateLimit: RATE_LIMITS.uploadAvatar,
    });
  });

  it('stores a valid image and answers with its URL', async () => {
    const response = await POST(uploadRequest(imageFile(PNG_BYTES, 'image/png')));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ avatarUrl: 'https://cdn.test/a.webp?t=1' });
    expect(replaceAvatar).toHaveBeenCalledWith('user-1', expect.any(ArrayBuffer));
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
  });

  it('returns the auth failure untouched', async () => {
    vi.mocked(authorizeMobileRequest).mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: 'unauthorized' }, { status: 401 }),
    });
    const response = await POST(uploadRequest());
    expect(response.status).toBe(401);
    expect(replaceAvatar).not.toHaveBeenCalled();
  });

  it('re-emits an upload-gate refusal with the mobile headers', async () => {
    const response = await POST(uploadRequest());
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'file_required' });
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(replaceAvatar).not.toHaveBeenCalled();
  });

  it('refuses a file whose bytes do not match its declared type', async () => {
    const response = await POST(
      uploadRequest(imageFile(new Uint8Array([1, 2, 3, 4]), 'image/png'))
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'invalid_file_type' });
  });

  it('answers 500 when storage fails', async () => {
    vi.mocked(replaceAvatar).mockResolvedValue({ error: 'upload_failed' });
    const response = await POST(uploadRequest(imageFile(PNG_BYTES, 'image/png')));
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'upload_failed' });
  });
});

describe('DELETE /api/mobile/v1/avatar', () => {
  beforeEach(() => {
    vi.mocked(authorizeMobileRequest).mockResolvedValue({ ok: true, user: USER as never });
  });

  it('clears the avatar under the delete budget', async () => {
    const response = await DELETE(
      new Request('https://example.test/api/mobile/v1/avatar', { method: 'DELETE' })
    );
    expect(response.status).toBe(200);
    expect(clearAvatar).toHaveBeenCalledWith('user-1');
    expect(authorizeMobileRequest).toHaveBeenCalledWith(expect.any(Request), {
      rateLimit: RATE_LIMITS.deleteAvatar,
    });
  });
});
