import sharpDefault from 'sharp';
import { describe, expect, it, vi } from 'vitest';

import {
  AnimatedImageNotSupportedError,
  POST_IMAGE_MAX_LONG_EDGE,
  POST_IMAGE_WEBP_QUALITY_LADDER,
  SHARP_INPUT_OPTIONS,
  isWithinMegapixelCap,
  normalizePostImageBuffer,
  probeImageDimensions,
} from './sharp-helpers';
import { POST_IMAGES_MAX_MEGAPIXELS } from './validation';

vi.mock('sharp', () => {
  // Minimal sharp mock that surfaces the chain we use:
  //   sharp(buffer, options).metadata()
  //   sharp(buffer, options).rotate().toBuffer()
  // The callback storage on the mock factory lets each test case
  // configure what metadata() returns and what toBuffer() produces.
  // `lastOptions` records the second arg passed to the constructor so
  // tests can assert SHARP_INPUT_OPTIONS is applied.
  const state = {
    metadata: { width: 100, height: 50, pages: 1 } as {
      width: number;
      height: number;
      pages?: number;
    },
    outputBuffer: Buffer.from([1, 2, 3]),
    metadataThrows: false,
    lastOptions: undefined as unknown,
    lastResizeArgs: undefined as unknown[] | undefined,
    lastWebpArgs: undefined as unknown[] | undefined,
  };

  function chain() {
    return {
      rotate: () => chain(),
      resize: (...args: unknown[]) => {
        state.lastResizeArgs = args;
        return chain();
      },
      webp: (...args: unknown[]) => {
        state.lastWebpArgs = args;
        return chain();
      },
      toBuffer: async () => state.outputBuffer,
      metadata: async () => {
        if (state.metadataThrows) {
          throw new Error('mock metadata failure');
        }
        return state.metadata;
      },
    };
  }

  function sharp(_input: unknown, options?: unknown) {
    state.lastOptions = options;
    return chain();
  }

  // expose state via a side-channel for tests
  (sharp as unknown as { __mockState: typeof state }).__mockState = state;

  return { default: sharp };
});

const mockState = (
  sharpDefault as unknown as {
    __mockState: {
      metadata: { width: number; height: number; pages?: number };
      outputBuffer: Buffer;
      metadataThrows: boolean;
      lastOptions: unknown;
      lastResizeArgs: unknown[] | undefined;
      lastWebpArgs: unknown[] | undefined;
    };
  }
).__mockState;

function setMockMetadata(metadata: { width: number; height: number; pages?: number }) {
  mockState.metadata = { pages: 1, ...metadata };
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

  it('rejects animated input (pages > 1) with AnimatedImageNotSupportedError', async () => {
    setMockMetadata({ width: 200, height: 200, pages: 7 });
    await expect(probeImageDimensions(Buffer.from([0]))).rejects.toBeInstanceOf(
      AnimatedImageNotSupportedError
    );
  });

  it('accepts non-animated input when pages is exactly 1', async () => {
    setMockMetadata({ width: 200, height: 200, pages: 1 });
    await expect(probeImageDimensions(Buffer.from([0]))).resolves.toEqual({
      width: 200,
      height: 200,
    });
  });

  it('passes SHARP_INPUT_OPTIONS to the sharp constructor', async () => {
    setMockMetadata({ width: 100, height: 100 });
    await probeImageDimensions(Buffer.from([0]));
    // SHARP_INPUT_OPTIONS is the contract — it MUST contain failOn:'error'
    // and pages:1 so animated WebP / APNG cannot decompress to GBs in
    // libvips and OOM the function. If this assertion fails, the
    // constants in sharp-helpers.ts have drifted from the security
    // contract documented in the module-level TSDoc.
    expect(mockState.lastOptions).toEqual(SHARP_INPUT_OPTIONS);
    expect(SHARP_INPUT_OPTIONS).toEqual({ failOn: 'error', pages: 1 });
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

describe('normalizePostImageBuffer', () => {
  it('returns the buffer produced by sharp().rotate().resize().toBuffer()', async () => {
    // Sharp's default-strip-on-toBuffer behavior (no .withMetadata() /
    // .keepMetadata() in the chain) is what removes EXIF / GPS; the
    // GPS-doesn't-leak regression lives in
    // sharp-helpers.exif-strip.test.ts, which exercises the real sharp
    // library against a fixture with embedded GPS EXIF.
    mockState.outputBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
    const result = await normalizePostImageBuffer({
      buffer: Buffer.from([0]),
      contentType: 'image/jpeg',
    });
    expect(Buffer.compare(result, Buffer.from([0xff, 0xd8, 0xff, 0xe0]))).toBe(0);
  });

  it('caps the long edge to POST_IMAGE_MAX_LONG_EDGE without enlarging smaller inputs', async () => {
    // The resize call is the load-bearing piece for the
    // Image-Optimization-cost reduction: without it, 50-MP camera
    // originals would be served straight to viewers (and to Vercel
    // optimization). `fit: 'inside'` preserves aspect; `withoutEnlargement`
    // makes the resize a no-op for small inputs. If any of these change,
    // the cost story drifts.
    mockState.outputBuffer = Buffer.from([0]);
    await normalizePostImageBuffer({
      buffer: Buffer.from([0]),
      contentType: 'image/jpeg',
    });
    expect(mockState.lastResizeArgs).toEqual([
      POST_IMAGE_MAX_LONG_EDGE,
      POST_IMAGE_MAX_LONG_EDGE,
      { fit: 'inside', withoutEnlargement: true },
    ]);
    expect(POST_IMAGE_MAX_LONG_EDGE).toBe(1600);
  });

  it('passes SHARP_INPUT_OPTIONS to the sharp constructor', async () => {
    // Same security contract as probeImageDimensions: failOn:'error' +
    // pages:1 must apply to the encoder path too, otherwise an animated
    // input that slipped past the probe could still OOM during encode.
    mockState.outputBuffer = Buffer.from([0xff, 0xd8]);
    await normalizePostImageBuffer({
      buffer: Buffer.from([0]),
      contentType: 'image/jpeg',
    });
    expect(mockState.lastOptions).toEqual(SHARP_INPUT_OPTIONS);
  });

  it('transcodes the output to WebP at the top of the quality ladder', async () => {
    // A PNG/JPEG input must be re-encoded as WebP: the resize bounds
    // dimensions but not bytes, and a lossless PNG re-encode can exceed
    // the 2 MB Storage/DB cap. WebP is the single bounded output format.
    mockState.outputBuffer = Buffer.from([1]); // tiny → fits on the first rung
    mockState.lastWebpArgs = undefined;
    await normalizePostImageBuffer({
      buffer: Buffer.from([0]),
      contentType: 'image/png',
    });
    expect(mockState.lastWebpArgs).toEqual([{ quality: POST_IMAGE_WEBP_QUALITY_LADDER[0] }]);
  });

  it('steps the WebP quality down until the output fits the byte budget', async () => {
    // The mock returns the same (oversized) buffer at every quality, so the
    // loop walks the entire ladder and the LAST recorded webp() call is the
    // lowest rung — proving the byte-budget step-down runs to completion.
    mockState.outputBuffer = Buffer.alloc(64); // 64 bytes
    mockState.lastWebpArgs = undefined;
    const ladder = POST_IMAGE_WEBP_QUALITY_LADDER;
    await normalizePostImageBuffer({
      buffer: Buffer.from([0]),
      contentType: 'image/png',
      maxBytes: 32, // smaller than the 64-byte output → never fits
    });
    expect(mockState.lastWebpArgs).toEqual([{ quality: ladder[ladder.length - 1] }]);
  });
});
