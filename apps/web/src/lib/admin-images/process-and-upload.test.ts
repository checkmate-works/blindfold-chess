import sharp from 'sharp';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SHARP_DECODE_OPTIONS } from '@/lib/images/sharp-options';

import { processAndUploadAdminImage } from './process-and-upload';

const mockToBuffer = vi.fn<() => Promise<Buffer>>();
const mockResize = vi.fn();
const mockRotate = vi.fn();

vi.mock('sharp', () => ({
  default: vi.fn(() => ({
    rotate: mockRotate.mockReturnThis(),
    resize: mockResize.mockReturnThis(),
    toBuffer: mockToBuffer,
  })),
}));

const mockUpload = vi.fn<() => Promise<{ error: unknown }>>();
const mockGetPublicUrl = vi.fn(() => ({ data: { publicUrl: 'https://cdn.example/a.png' } }));
const supabase = {
  storage: { from: () => ({ upload: mockUpload, getPublicUrl: mockGetPublicUrl }) },
} as unknown as Parameters<typeof processAndUploadAdminImage>[0]['supabase'];

const file = new File([new Uint8Array([1, 2, 3])], 'a.png', { type: 'image/png' });

function run() {
  return processAndUploadAdminImage({
    supabase,
    bucket: 'bucket',
    ownerId: 'owner-1',
    file,
    buffer: new Uint8Array([1, 2, 3]).buffer,
    maxLongEdge: 512,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockToBuffer.mockResolvedValue(Buffer.from('processed'));
  mockUpload.mockResolvedValue({ error: null });
});

describe('processAndUploadAdminImage', () => {
  it('decodes with the hardened options, caps the long edge and uploads the re-encoded bytes', async () => {
    const result = await run();

    expect(sharp).toHaveBeenCalledWith(expect.any(Buffer), SHARP_DECODE_OPTIONS);
    expect(mockResize).toHaveBeenCalledWith(512, 512, { fit: 'inside', withoutEnlargement: true });
    expect(mockUpload).toHaveBeenCalledWith(
      expect.stringMatching(/^owner-1\/\d+\.png$/),
      Buffer.from('processed'),
      {
        contentType: 'image/png',
        upsert: false,
      }
    );
    expect(result).toEqual({
      ok: true,
      storagePath: expect.stringMatching(/^owner-1\/\d+\.png$/),
      publicUrl: 'https://cdn.example/a.png',
      byteLength: Buffer.from('processed').byteLength,
    });
  });

  it('reports a decode failure as an invalid file without touching Storage', async () => {
    mockToBuffer.mockRejectedValue(new Error('bad input'));

    const result = await run();

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('unreachable');
    expect(result.response.status).toBe(400);
    await expect(result.response.json()).resolves.toEqual({ error: 'invalid_file_type' });
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it('reports a Storage failure as a server error', async () => {
    mockUpload.mockResolvedValue({ error: new Error('storage down') });

    const result = await run();

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('unreachable');
    expect(result.response.status).toBe(500);
    await expect(result.response.json()).resolves.toEqual({ error: 'upload_failed' });
    expect(mockGetPublicUrl).not.toHaveBeenCalled();
  });
});
