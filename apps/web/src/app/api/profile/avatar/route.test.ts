import { beforeEach, describe, expect, it, vi } from 'vitest';

import { whereThenReturning } from '@/lib/db/__test-support__/query-chain';
import { actualDbSchema } from '@/lib/db/__test-support__/schema-actual';
import { isUserBanned as mockIsUserBanned } from '@/lib/moderation/__mocks__/ban';

import { POST } from './route';

const mockGetUser = vi.fn();
const mockUpload = vi.fn();
const mockGetPublicUrl = vi.fn();
const mockList = vi.fn();
const mockRemove = vi.fn();

vi.mock('@/lib/csrf', () => ({
  isValidOrigin: () => true,
}));

vi.mock('@/lib/auth', () => ({
  authenticateAndGuardApi: async (rateLimitConfig: {
    action: string;
    maxAttempts: number;
    windowMs: number;
  }) => {
    const { createClient } = await import('@/lib/supabase/server');
    const { isUserBanned } = await import('@/lib/moderation/ban');
    const { checkRateLimit } = await import('@/lib/security/rate-limit');
    const { NextResponse } = await import('next/server');

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { response: NextResponse.json({ error: 'unauthorized' }, { status: 401 }) };
    }

    if (await isUserBanned(user.id)) {
      return { response: NextResponse.json({ error: 'banned' }, { status: 403 }) };
    }

    const rateLimitResult = await checkRateLimit(user.id, rateLimitConfig);
    if ('error' in rateLimitResult) {
      return { response: NextResponse.json({ error: 'rateLimited' }, { status: 429 }) };
    }

    return { user };
  },
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: () =>
    Promise.resolve({
      auth: {
        getUser: mockGetUser,
      },
      storage: {
        from: () => ({
          upload: mockUpload,
          getPublicUrl: mockGetPublicUrl,
          list: mockList,
          remove: mockRemove,
        }),
      },
    }),
}));

vi.mock('@/lib/moderation/ban');

vi.mock('@/lib/security/rate-limit');

// Sharp is exercised end-to-end in production; here we stub the pipeline to
// avoid invoking libvips on test fixtures (the magic-byte arrays in this file
// aren't decodable). The route's `try/catch` around the Sharp pipeline is
// covered separately via `mockSharpToBuffer.mockRejectedValueOnce(...)`.
const mockSharpToBuffer = vi.fn();
vi.mock('sharp', () => {
  const factory = vi.fn(() => ({
    rotate: vi.fn().mockReturnThis(),
    resize: vi.fn().mockReturnThis(),
    webp: vi.fn().mockReturnThis(),
    toBuffer: mockSharpToBuffer,
  }));
  return { default: factory };
});

// The UPDATE reads the username back with `.returning()` to expire that
// profile's Data Cache tag.
const mockWhere = vi.fn<() => unknown[]>().mockReturnValue([{ username: 'tester' }]);

vi.mock('@/lib/db', async () => ({
  ...(await actualDbSchema()),
  db: {
    update: () => ({
      set: () => ({
        where: whereThenReturning(mockWhere),
      }),
    }),
  },
}));

const testUserId = 'user-id-00000000-0000-0000-0000-000000000001';

// Valid magic bytes for each supported image format. PNG carries its full
// 8-byte signature (89 50 4E 47 0D 0A 1A 0A) — the shared
// validateImageBinarySignature checks all eight, not just the first four.
const JPEG_MAGIC = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, ...new Array(8).fill(0)]);
const PNG_MAGIC = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x00,
]);
const WEBP_MAGIC = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
]);

/**
 * Creates a mock File-like object that passes `instanceof File` check
 * and has a working `arrayBuffer()` method (jsdom FormData strips it).
 */
function createMockFile(content: string | Uint8Array, name: string, type: string): File {
  const bytes = typeof content === 'string' ? new TextEncoder().encode(content) : content;
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);

  const file = new File([bytes as BlobPart], name, { type });
  // jsdom FormData.get() may return a File without arrayBuffer; patch it
  if (typeof file.arrayBuffer !== 'function') {
    (file as unknown as Record<string, unknown>).arrayBuffer = () => Promise.resolve(buffer);
  }
  return file;
}

function createMockFormData(file: File | null, fieldName = 'file'): FormData {
  const map = new Map<string, File | string>();
  if (file) {
    map.set(fieldName, file);
  }

  return {
    get: (key: string) => map.get(key) ?? null,
  } as unknown as FormData;
}

function createMockRequest(formData: FormData): Request {
  return {
    formData: () => Promise.resolve(formData),
  } as unknown as Request;
}

function createMockRequestWithFile(file: File | null, fieldName = 'file'): Request {
  const formData = createMockFormData(file, fieldName);
  return createMockRequest(formData);
}

function createStringFieldRequest(fieldName: string, value: string): Request {
  const map = new Map<string, File | string>();
  map.set(fieldName, value);
  const formData = {
    get: (key: string) => map.get(key) ?? null,
  } as unknown as FormData;
  return createMockRequest(formData);
}

function createInvalidFormDataRequest(): Request {
  return {
    formData: () => Promise.reject(new Error('Invalid form data')),
  } as unknown as Request;
}

function setupAuthenticatedUser() {
  mockGetUser.mockResolvedValue({
    data: { user: { id: testUserId } },
  });
  mockIsUserBanned.mockResolvedValue(false);
}

function setupSuccessfulUpload() {
  mockUpload.mockResolvedValue({ error: null });
  mockGetPublicUrl.mockReturnValue({
    data: {
      publicUrl: `https://storage.example.com/avatars/${testUserId}/avatar.webp`,
    },
  });
  mockList.mockResolvedValue({ data: [] });
  mockRemove.mockResolvedValue({ data: [] });
  mockSharpToBuffer.mockResolvedValue(Buffer.from('mocked-webp-bytes'));
}

describe('POST /api/profile/avatar', () => {
  beforeEach(() => {
    vi.spyOn(Date, 'now').mockReturnValue(1709700000000);
  });

  describe('authentication', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
      });

      const file = createMockFile('image-data', 'avatar.jpg', 'image/jpeg');
      const request = createMockRequestWithFile(file);
      const response = await POST(request);

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body).toEqual({ error: 'unauthorized' });

      expect(mockUpload).not.toHaveBeenCalled();
      expect(mockWhere).not.toHaveBeenCalled();
    });
  });

  describe('ban enforcement', () => {
    it('should return 403 when user is banned', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: testUserId } },
      });
      mockIsUserBanned.mockResolvedValue(true);

      const file = createMockFile(JPEG_MAGIC, 'photo.jpg', 'image/jpeg');
      const request = createMockRequestWithFile(file);
      const response = await POST(request);

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body).toEqual({ error: 'banned' });
      expect(mockUpload).not.toHaveBeenCalled();
      expect(mockWhere).not.toHaveBeenCalled();
    });
  });

  describe('successful upload', () => {
    beforeEach(() => {
      setupAuthenticatedUser();
      setupSuccessfulUpload();
    });

    it('should upload JPEG file and return WebP avatar URL', async () => {
      const file = createMockFile(JPEG_MAGIC, 'photo.jpg', 'image/jpeg');
      const request = createMockRequestWithFile(file);
      const response = await POST(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      // Input format is normalized to WebP via Sharp before storage.
      expect(body.avatarUrl).toBe(
        `https://storage.example.com/avatars/${testUserId}/avatar.webp?t=1709700000000`
      );
    });

    it('should upload PNG file as WebP', async () => {
      const file = createMockFile(PNG_MAGIC, 'photo.png', 'image/png');
      const request = createMockRequestWithFile(file);
      const response = await POST(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.avatarUrl).toContain('avatar.webp');
    });

    it('should upload WebP file as WebP', async () => {
      const file = createMockFile(WEBP_MAGIC, 'photo.webp', 'image/webp');
      const request = createMockRequestWithFile(file);
      const response = await POST(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.avatarUrl).toContain('avatar.webp');
    });

    it('should upload to a fixed user-scoped WebP path with image/webp content type', async () => {
      const file = createMockFile(JPEG_MAGIC, 'photo.jpg', 'image/jpeg');
      const request = createMockRequestWithFile(file);
      await POST(request);

      expect(mockUpload).toHaveBeenCalledWith(`${testUserId}/avatar.webp`, expect.anything(), {
        contentType: 'image/webp',
        upsert: true,
      });
      // Sharp pipeline returns a Node Buffer; verify the upload payload is
      // the Sharp-processed buffer rather than the raw ArrayBuffer.
      const uploadedBuffer = mockUpload.mock.calls[0][1];
      expect(Buffer.isBuffer(uploadedBuffer)).toBe(true);
    });

    it('should use upsert to replace existing avatar', async () => {
      const file = createMockFile(JPEG_MAGIC, 'new-avatar.jpg', 'image/jpeg');
      const request = createMockRequestWithFile(file);
      await POST(request);

      expect(mockUpload).toHaveBeenCalledWith(
        expect.any(String),
        expect.anything(),
        expect.objectContaining({ upsert: true })
      );
    });

    it('should update profile avatarUrl in database', async () => {
      const file = createMockFile(JPEG_MAGIC, 'photo.jpg', 'image/jpeg');
      const request = createMockRequestWithFile(file);
      await POST(request);

      expect(mockWhere).toHaveBeenCalled();
    });

    it('should append cache-busting timestamp to avatar URL', async () => {
      const file = createMockFile(JPEG_MAGIC, 'photo.jpg', 'image/jpeg');
      const request = createMockRequestWithFile(file);
      const response = await POST(request);

      const body = await response.json();
      expect(body.avatarUrl).toContain('?t=1709700000000');
    });
  });

  describe('file type validation', () => {
    beforeEach(() => {
      setupAuthenticatedUser();
    });

    it('should return 400 when no file is provided', async () => {
      const request = createMockRequestWithFile(null);
      const response = await POST(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body).toEqual({ error: 'file_required' });
    });

    it('should return 400 for GIF file type', async () => {
      const file = createMockFile('gif-data', 'animation.gif', 'image/gif');
      const request = createMockRequestWithFile(file);
      const response = await POST(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body).toEqual({ error: 'invalid_file_type' });
    });

    it('should return 400 for SVG file type', async () => {
      const file = createMockFile('<svg></svg>', 'icon.svg', 'image/svg+xml');
      const request = createMockRequestWithFile(file);
      const response = await POST(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body).toEqual({ error: 'invalid_file_type' });
    });

    it('should return 400 for PDF file type', async () => {
      const file = createMockFile('pdf-data', 'doc.pdf', 'application/pdf');
      const request = createMockRequestWithFile(file);
      const response = await POST(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body).toEqual({ error: 'invalid_file_type' });
    });

    it('should return 400 for text file', async () => {
      const file = createMockFile('hello', 'readme.txt', 'text/plain');
      const request = createMockRequestWithFile(file);
      const response = await POST(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body).toEqual({ error: 'invalid_file_type' });
    });
  });

  describe('file size validation', () => {
    beforeEach(() => {
      setupAuthenticatedUser();
    });

    it('should return 400 when file exceeds 2MB', async () => {
      const largeContent = new Uint8Array(2 * 1024 * 1024 + 1);
      const file = createMockFile(largeContent, 'large.jpg', 'image/jpeg');
      const request = createMockRequestWithFile(file);
      const response = await POST(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body).toEqual({ error: 'file_too_large' });
    });

    it('should accept file exactly at 2MB limit', async () => {
      setupSuccessfulUpload();

      const exactContent = new Uint8Array(2 * 1024 * 1024);
      exactContent.set(JPEG_MAGIC);
      const file = createMockFile(exactContent, 'exact.jpg', 'image/jpeg');
      const request = createMockRequestWithFile(file);
      const response = await POST(request);

      expect(response.status).toBe(200);
    });

    it('should accept file under 2MB', async () => {
      setupSuccessfulUpload();

      const smallContent = new Uint8Array(1024);
      smallContent.set(PNG_MAGIC);
      const file = createMockFile(smallContent, 'small.png', 'image/png');
      const request = createMockRequestWithFile(file);
      const response = await POST(request);

      expect(response.status).toBe(200);
    });
  });

  describe('form data errors', () => {
    beforeEach(() => {
      setupAuthenticatedUser();
    });

    it('should return 400 when request body is not valid form data', async () => {
      const request = createInvalidFormDataRequest();
      const response = await POST(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body).toEqual({ error: 'invalid_form_data' });
    });

    it('should return 400 when form data has wrong field name', async () => {
      const file = createMockFile('data', 'avatar.jpg', 'image/jpeg');
      const request = createMockRequestWithFile(file, 'image');
      const response = await POST(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body).toEqual({ error: 'file_required' });
    });

    it('should return 400 when form field is a string instead of a file', async () => {
      const request = createStringFieldRequest('file', 'just-a-string');
      const response = await POST(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body).toEqual({ error: 'file_required' });
    });
  });

  describe('storage upload errors', () => {
    beforeEach(() => {
      setupAuthenticatedUser();
    });

    it('should return 500 when storage upload fails', async () => {
      mockList.mockResolvedValue({ data: [] });
      mockUpload.mockResolvedValue({
        error: new Error('Storage error'),
      });

      const file = createMockFile(JPEG_MAGIC, 'photo.jpg', 'image/jpeg');
      const request = createMockRequestWithFile(file);
      const response = await POST(request);

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body).toEqual({ error: 'upload_failed' });

      // Should not update profile when upload fails
      expect(mockWhere).not.toHaveBeenCalled();
    });
  });

  describe('operation order', () => {
    it('should upload to storage before updating profile', async () => {
      const callOrder: string[] = [];

      setupAuthenticatedUser();
      mockList.mockResolvedValue({ data: [] });
      mockUpload.mockImplementation(async () => {
        callOrder.push('upload');
        return { error: null };
      });
      mockGetPublicUrl.mockReturnValue({
        data: {
          publicUrl: `https://storage.example.com/avatars/${testUserId}/avatar.jpg`,
        },
      });
      mockWhere.mockImplementation(() => {
        callOrder.push('updateProfile');
        return [{ username: 'tester' }];
      });

      const file = createMockFile(JPEG_MAGIC, 'photo.jpg', 'image/jpeg');
      const request = createMockRequestWithFile(file);
      await POST(request);

      expect(callOrder).toEqual(['upload', 'updateProfile']);
    });
  });

  describe('edge cases', () => {
    beforeEach(() => {
      setupAuthenticatedUser();
      setupSuccessfulUpload();
    });

    it('should handle file with special characters in name', async () => {
      const file = createMockFile(JPEG_MAGIC, 'my avatar (1).jpg', 'image/jpeg');
      const request = createMockRequestWithFile(file);
      const response = await POST(request);

      // File name is ignored; storage path is always `${userId}/avatar.webp`.
      expect(response.status).toBe(200);
      expect(mockUpload).toHaveBeenCalledWith(
        `${testUserId}/avatar.webp`,
        expect.anything(),
        expect.any(Object)
      );
    });

    it('should handle file with very long name', async () => {
      const longName = 'a'.repeat(255) + '.jpg';
      const file = createMockFile(JPEG_MAGIC, longName, 'image/jpeg');
      const request = createMockRequestWithFile(file);
      const response = await POST(request);

      // File name is ignored; storage path uses user ID and extension
      expect(response.status).toBe(200);
    });

    it('should reject empty file (0 bytes) due to missing magic bytes', async () => {
      const file = createMockFile(new Uint8Array(0), 'empty.jpg', 'image/jpeg');
      const request = createMockRequestWithFile(file);
      const response = await POST(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body).toEqual({ error: 'invalid_file_type' });
    });

    it('should always use .webp extension regardless of input MIME', async () => {
      // File claims to be JPEG via MIME type but has .png extension —
      // every supported input is normalized to WebP at the Sharp pipeline.
      const file = createMockFile(JPEG_MAGIC, 'photo.png', 'image/jpeg');
      const request = createMockRequestWithFile(file);
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockUpload).toHaveBeenCalledWith(
        `${testUserId}/avatar.webp`,
        expect.anything(),
        expect.objectContaining({ contentType: 'image/webp' })
      );
    });
  });

  describe('magic bytes validation', () => {
    beforeEach(() => {
      setupAuthenticatedUser();
    });

    it('should reject file with valid MIME type but invalid magic bytes', async () => {
      const fakeJpeg = new Uint8Array([
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      ]);
      const file = createMockFile(fakeJpeg, 'fake.jpg', 'image/jpeg');
      const request = createMockRequestWithFile(file);
      const response = await POST(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body).toEqual({ error: 'invalid_file_type' });
      expect(mockUpload).not.toHaveBeenCalled();
    });

    it('should reject PNG MIME type with JPEG magic bytes', async () => {
      const file = createMockFile(JPEG_MAGIC, 'photo.png', 'image/png');
      const request = createMockRequestWithFile(file);
      const response = await POST(request);

      // The signature must match the *declared* MIME — a JPEG payload
      // declared as image/png is a MIME-spoof and is rejected.
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body).toEqual({ error: 'invalid_file_type' });
      expect(mockUpload).not.toHaveBeenCalled();
    });

    it('should accept file with valid JPEG magic bytes', async () => {
      setupSuccessfulUpload();

      const file = createMockFile(JPEG_MAGIC, 'photo.jpg', 'image/jpeg');
      const request = createMockRequestWithFile(file);
      const response = await POST(request);

      expect(response.status).toBe(200);
    });

    it('should accept file with valid PNG magic bytes', async () => {
      setupSuccessfulUpload();

      const file = createMockFile(PNG_MAGIC, 'photo.png', 'image/png');
      const request = createMockRequestWithFile(file);
      const response = await POST(request);

      expect(response.status).toBe(200);
    });

    it('should accept file with valid WebP magic bytes', async () => {
      setupSuccessfulUpload();

      const file = createMockFile(WEBP_MAGIC, 'photo.webp', 'image/webp');
      const request = createMockRequestWithFile(file);
      const response = await POST(request);

      expect(response.status).toBe(200);
    });

    it('should return 400 when Sharp rejects the input as malformed', async () => {
      setupSuccessfulUpload();
      mockSharpToBuffer.mockRejectedValueOnce(new Error('VipsJpeg: Premature end of input file'));

      const file = createMockFile(JPEG_MAGIC, 'photo.jpg', 'image/jpeg');
      const request = createMockRequestWithFile(file);
      const response = await POST(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body).toEqual({ error: 'invalid_file_type' });
      expect(mockUpload).not.toHaveBeenCalled();
    });
  });

  describe('stale file cleanup', () => {
    beforeEach(() => {
      setupAuthenticatedUser();
      setupSuccessfulUpload();
    });

    it('should delete existing files before uploading new one', async () => {
      mockList.mockResolvedValue({
        data: [{ name: 'avatar.png' }],
      });

      const file = createMockFile(JPEG_MAGIC, 'photo.jpg', 'image/jpeg');
      const request = createMockRequestWithFile(file);
      await POST(request);

      expect(mockList).toHaveBeenCalledWith(testUserId);
      expect(mockRemove).toHaveBeenCalledWith([`${testUserId}/avatar.png`]);
      expect(mockUpload).toHaveBeenCalled();
    });

    it('should delete multiple existing files before uploading', async () => {
      mockList.mockResolvedValue({
        data: [{ name: 'avatar.png' }, { name: 'avatar.jpg' }],
      });

      const file = createMockFile(WEBP_MAGIC, 'photo.webp', 'image/webp');
      const request = createMockRequestWithFile(file);
      await POST(request);

      expect(mockRemove).toHaveBeenCalledWith([
        `${testUserId}/avatar.png`,
        `${testUserId}/avatar.jpg`,
      ]);
    });

    it('should skip deletion when no existing files', async () => {
      mockList.mockResolvedValue({ data: [] });

      const file = createMockFile(JPEG_MAGIC, 'photo.jpg', 'image/jpeg');
      const request = createMockRequestWithFile(file);
      await POST(request);

      expect(mockList).toHaveBeenCalledWith(testUserId);
      expect(mockRemove).not.toHaveBeenCalled();
      expect(mockUpload).toHaveBeenCalled();
    });

    it('should skip deletion when list returns null data', async () => {
      mockList.mockResolvedValue({ data: null });

      const file = createMockFile(JPEG_MAGIC, 'photo.jpg', 'image/jpeg');
      const request = createMockRequestWithFile(file);
      await POST(request);

      expect(mockRemove).not.toHaveBeenCalled();
      expect(mockUpload).toHaveBeenCalled();
    });
  });
});
