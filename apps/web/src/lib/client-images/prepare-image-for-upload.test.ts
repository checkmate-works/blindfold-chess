import { describe, expect, it } from 'vitest';

import {
  MAX_LONG_EDGE,
  TARGET_MAX_BYTES,
  computeScale,
  needsResize,
  sniffImageKind,
} from './prepare-image-for-upload';

/** Build a Uint8Array from a list of bytes padded to at least `len`. */
function bytes(head: number[], len = head.length): Uint8Array {
  const arr = new Uint8Array(Math.max(len, head.length));
  arr.set(head);
  return arr;
}

/** ftyp box with the given 4-char brand at offset 8. */
function ftyp(brand: string): Uint8Array {
  const b = new Uint8Array(16);
  b.set([0x00, 0x00, 0x00, 0x18], 0); // box size (arbitrary)
  b.set([0x66, 0x74, 0x79, 0x70], 4); // "ftyp"
  b.set([brand.charCodeAt(0), brand.charCodeAt(1), brand.charCodeAt(2), brand.charCodeAt(3)], 8);
  return b;
}

describe('sniffImageKind', () => {
  it('detects JPEG by SOI marker', () => {
    expect(sniffImageKind(bytes([0xff, 0xd8, 0xff, 0xe0]))).toBe('jpeg');
  });

  it('detects PNG by its 8-byte signature', () => {
    expect(sniffImageKind(bytes([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe('png');
  });

  it('detects WebP by RIFF/WEBP fourccs', () => {
    // "RIFF" ???? "WEBP"
    const b = bytes([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
    expect(sniffImageKind(b)).toBe('webp');
  });

  it.each(['heic', 'heix', 'heim', 'heis', 'hevc', 'hevx', 'mif1', 'msf1', 'heif'])(
    'detects HEIF-family brand %s',
    (brand) => {
      expect(sniffImageKind(ftyp(brand))).toBe('heic');
    }
  );

  it('does not mistake a non-HEIF ftyp brand (e.g. mp4) for HEIC', () => {
    expect(sniffImageKind(ftyp('isom'))).toBe('other');
    expect(sniffImageKind(ftyp('mp42'))).toBe('other');
  });

  it('returns other for unrecognized or too-short input', () => {
    expect(sniffImageKind(bytes([0x00, 0x01, 0x02, 0x03]))).toBe('other');
    expect(sniffImageKind(bytes([0xff, 0xd8]))).toBe('other'); // truncated JPEG
    expect(sniffImageKind(new Uint8Array(0))).toBe('other');
  });
});

describe('needsResize', () => {
  it('is true when the file exceeds the byte target', () => {
    expect(needsResize(TARGET_MAX_BYTES + 1, 800)).toBe(true);
  });

  it('is true when the long edge exceeds the pixel cap', () => {
    expect(needsResize(100_000, MAX_LONG_EDGE + 1)).toBe(true);
  });

  it('is false when within both limits', () => {
    expect(needsResize(TARGET_MAX_BYTES, MAX_LONG_EDGE)).toBe(false);
    expect(needsResize(500_000, 1024)).toBe(false);
  });
});

describe('computeScale', () => {
  it('returns 1 when already within the long-edge cap', () => {
    expect(computeScale(1600, 1200)).toBe(1);
    expect(computeScale(MAX_LONG_EDGE, MAX_LONG_EDGE)).toBe(1);
  });

  it('scales the longest edge down to the cap, preserving aspect ratio', () => {
    const scale = computeScale(4096, 3072);
    expect(scale).toBeCloseTo(MAX_LONG_EDGE / 4096);
    // longest edge maps exactly to the cap
    expect(Math.round(4096 * scale)).toBe(MAX_LONG_EDGE);
  });

  it('uses height when it is the longest edge (portrait)', () => {
    const scale = computeScale(3000, 6000);
    expect(scale).toBeCloseTo(MAX_LONG_EDGE / 6000);
  });
});
