import { beforeEach, describe, expect, it, vi } from 'vitest';

import { POST } from './route';

const mockGetUser = vi.fn();
const mockUpload = vi.fn();
const mockGetPublicUrl = vi.fn();

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
        }),
      },
    }),
}));

const mockWhere = vi.fn().mockResolvedValue(undefined);

vi.mock('@/lib/db', () => ({
  db: {
    update: () => ({
      set: () => ({
        where: mockWhere,
      }),
    }),
  },
  profiles: {
    id: 'id',
    avatarUrl: 'avatar_url',
    updatedAt: 'updated_at',
  },
}));

const testUserId = 'user-id-00000000-0000-0000-0000-000000000001';

/**
 * Creates a mock File-like object that passes `instanceof File` check
 * and has a working `arrayBuffer()` method (jsdom FormData strips it).
 */
function createMockFile(content: string | Uint8Array, name: string, type: string): File {
  const bytes = typeof content === 'string' ? new TextEncoder().encode(content) : content;
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);

  const file = new File([bytes], name, { type });
  // jsdom FormData.get() may return a File without arrayBuffer; patch it
  if (typeof file.arrayBuffer !== 'function') {
    (file as Record<string, unknown>).arrayBuffer = () => Promise.resolve(buffer);
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
}

function setupSuccessfulUpload() {
  mockUpload.mockResolvedValue({ error: null });
  mockGetPublicUrl.mockReturnValue({
    data: {
      publicUrl: `https://storage.example.com/avatars/${testUserId}/avatar.jpg`,
    },
  });
}

describe('POST /api/profile/avatar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  describe('successful upload', () => {
    beforeEach(() => {
      setupAuthenticatedUser();
      setupSuccessfulUpload();
    });

    it('should upload JPEG file and return avatar URL', async () => {
      const file = createMockFile('jpeg-data', 'photo.jpg', 'image/jpeg');
      const request = createMockRequestWithFile(file);
      const response = await POST(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.avatarUrl).toBe(
        `https://storage.example.com/avatars/${testUserId}/avatar.jpg?t=1709700000000`
      );
    });

    it('should upload PNG file with correct extension', async () => {
      mockGetPublicUrl.mockReturnValue({
        data: {
          publicUrl: `https://storage.example.com/avatars/${testUserId}/avatar.png`,
        },
      });

      const file = createMockFile('png-data', 'photo.png', 'image/png');
      const request = createMockRequestWithFile(file);
      const response = await POST(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.avatarUrl).toContain('avatar.png');
    });

    it('should upload WebP file with correct extension', async () => {
      mockGetPublicUrl.mockReturnValue({
        data: {
          publicUrl: `https://storage.example.com/avatars/${testUserId}/avatar.webp`,
        },
      });

      const file = createMockFile('webp-data', 'photo.webp', 'image/webp');
      const request = createMockRequestWithFile(file);
      const response = await POST(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.avatarUrl).toContain('avatar.webp');
    });

    it('should upload to correct storage path using user ID', async () => {
      const file = createMockFile('jpeg-data', 'photo.jpg', 'image/jpeg');
      const request = createMockRequestWithFile(file);
      await POST(request);

      expect(mockUpload).toHaveBeenCalledWith(`${testUserId}/avatar.jpg`, expect.anything(), {
        contentType: 'image/jpeg',
        upsert: true,
      });
      const uploadedBuffer = mockUpload.mock.calls[0][1];
      expect(uploadedBuffer.constructor.name).toBe('ArrayBuffer');
    });

    it('should use upsert to replace existing avatar', async () => {
      const file = createMockFile('new-data', 'new-avatar.jpg', 'image/jpeg');
      const request = createMockRequestWithFile(file);
      await POST(request);

      expect(mockUpload).toHaveBeenCalledWith(
        expect.any(String),
        expect.anything(),
        expect.objectContaining({ upsert: true })
      );
    });

    it('should update profile avatarUrl in database', async () => {
      const file = createMockFile('jpeg-data', 'photo.jpg', 'image/jpeg');
      const request = createMockRequestWithFile(file);
      await POST(request);

      expect(mockWhere).toHaveBeenCalled();
    });

    it('should append cache-busting timestamp to avatar URL', async () => {
      const file = createMockFile('jpeg-data', 'photo.jpg', 'image/jpeg');
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
      const file = createMockFile(exactContent, 'exact.jpg', 'image/jpeg');
      const request = createMockRequestWithFile(file);
      const response = await POST(request);

      expect(response.status).toBe(200);
    });

    it('should accept file under 2MB', async () => {
      setupSuccessfulUpload();

      const smallContent = new Uint8Array(1024);
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
      mockUpload.mockResolvedValue({
        error: new Error('Storage error'),
      });

      const file = createMockFile('jpeg-data', 'photo.jpg', 'image/jpeg');
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
      mockUpload.mockImplementation(async () => {
        callOrder.push('upload');
        return { error: null };
      });
      mockGetPublicUrl.mockReturnValue({
        data: {
          publicUrl: `https://storage.example.com/avatars/${testUserId}/avatar.jpg`,
        },
      });
      mockWhere.mockImplementation(async () => {
        callOrder.push('updateProfile');
        return undefined;
      });

      const file = createMockFile('jpeg-data', 'photo.jpg', 'image/jpeg');
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
      const file = createMockFile('data', 'my avatar (1).jpg', 'image/jpeg');
      const request = createMockRequestWithFile(file);
      const response = await POST(request);

      // File name is ignored; storage path uses user ID and extension
      expect(response.status).toBe(200);
      expect(mockUpload).toHaveBeenCalledWith(
        `${testUserId}/avatar.jpg`,
        expect.anything(),
        expect.any(Object)
      );
    });

    it('should handle file with very long name', async () => {
      const longName = 'a'.repeat(255) + '.jpg';
      const file = createMockFile('data', longName, 'image/jpeg');
      const request = createMockRequestWithFile(file);
      const response = await POST(request);

      // File name is ignored; storage path uses user ID and extension
      expect(response.status).toBe(200);
    });

    it('should handle empty file (0 bytes)', async () => {
      const file = createMockFile(new Uint8Array(0), 'empty.jpg', 'image/jpeg');
      const request = createMockRequestWithFile(file);
      const response = await POST(request);

      // Empty files pass validation (only size > MAX_SIZE is rejected)
      expect(response.status).toBe(200);
    });

    it('should use extension from MIME type, not from filename', async () => {
      // File claims to be JPEG via MIME type but has .png extension
      const file = createMockFile('data', 'photo.png', 'image/jpeg');
      const request = createMockRequestWithFile(file);
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockUpload).toHaveBeenCalledWith(
        `${testUserId}/avatar.jpg`,
        expect.anything(),
        expect.objectContaining({ contentType: 'image/jpeg' })
      );
    });
  });
});
