import { POST_IMAGES_MAX_MEGAPIXELS } from '@/app/api/posts/[id]/images/post-image-validation';
import sharpDefault from 'sharp';
import { describe, expect, it, vi } from 'vitest';

import {
  isWithinMegapixelCap,
  probeImageDimensions,
  stripExifAndApplyOrientation,
} from './sharp-helpers';

vi.mock('server-only', () => ({}));

vi.mock('sharp', () => {
  // Minimal sharp mock that surfaces the chain we use:
  //   sharp(buffer).metadata()
  //   sharp(buffer).rotate().toBuffer()
  // The callback storage on the mock factory lets each test case
  // configure what metadata() returns and what toBuffer() produces.
  const state = {
    metadata: { width: 100, height: 50 },
    outputBuffer: Buffer.from([1, 2, 3]),
    metadataThrows: false,
  };

  function chain() {
    return {
      rotate: () => chain(),
      toBuffer: async () => state.outputBuffer,
      metadata: async () => {
        if (state.metadataThrows) {
          throw new Error('mock metadata failure');
        }
        return state.metadata;
      },
    };
  }

  function sharp() {
    return chain();
  }

  // expose state via a side-channel for tests
  (sharp as unknown as { __mockState: typeof state }).__mockState = state;

  return { default: sharp };
});

const mockState = (
  sharpDefault as unknown as {
    __mockState: {
      metadata: { width: number; height: number };
      outputBuffer: Buffer;
      metadataThrows: boolean;
    };
  }
).__mockState;

function setMockMetadata(metadata: { width: number; height: number }) {
  mockState.metadata = metadata;
  mockState.metadataThrows = false;
}

describe('probeImageDimensions', () => {
  it('returns width/height from sharp metadata', async () => {
    setMockMetadata({ width: 1920, height: 1080 });
    await expect(probeImageDimensions(Buffer.from([0]))).resolves.toEqual({
      width: 1920,
      height: 1080,
    });
  });

  it('throws when width is missing', async () => {
    setMockMetadata({ width: 0, height: 100 });
    await expect(probeImageDimensions(Buffer.from([0]))).rejects.toThrow();
  });

  it('throws when height is missing', async () => {
    setMockMetadata({ width: 100, height: 0 });
    await expect(probeImageDimensions(Buffer.from([0]))).rejects.toThrow();
  });

  it('propagates sharp errors as a thrown Error', async () => {
    mockState.metadataThrows = true;
    await expect(probeImageDimensions(Buffer.from([0]))).rejects.toThrow();
    mockState.metadataThrows = false;
  });
});

describe('isWithinMegapixelCap', () => {
  it('accepts a 12 MP smartphone image', () => {
    expect(isWithinMegapixelCap({ width: 4032, height: 3024 })).toBe(true);
  });

  it('accepts an image exactly at the 50 MP cap', () => {
    expect(isWithinMegapixelCap({ width: 10000, height: 5000 })).toBe(true);
    expect(10000 * 5000).toBe(POST_IMAGES_MAX_MEGAPIXELS);
  });

  it('rejects an image that exceeds the 50 MP cap by 1 pixel', () => {
    expect(isWithinMegapixelCap({ width: 10001, height: 5000 })).toBe(false);
  });

  it('rejects a decompression-bomb-style image (50001 x 50001)', () => {
    expect(isWithinMegapixelCap({ width: 50001, height: 50001 })).toBe(false);
  });
});

describe('stripExifAndApplyOrientation', () => {
  it('returns the post-strip buffer produced by sharp().rotate().toBuffer()', async () => {
    // We rely on Sharp's default-strip-on-toBuffer behavior (no
    // .withMetadata() / .keepMetadata() in the chain), so the test only
    // asserts the buffer is the one Sharp produced. The
    // GPS-doesn't-leak regression lives in
    // sharp-helpers.exif-strip.test.ts, which exercises the real
    // sharp library against a fixture with embedded GPS EXIF.
    mockState.outputBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
    const result = await stripExifAndApplyOrientation({
      buffer: Buffer.from([0]),
      contentType: 'image/jpeg',
    });
    expect(Buffer.compare(result, Buffer.from([0xff, 0xd8, 0xff, 0xe0]))).toBe(0);
  });
});
