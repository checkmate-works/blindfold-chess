import { describe, expect, it } from 'vitest';

import {
  MAX_IMAGES_PER_POST,
  POST_IMAGES_ALLOWED_MIME_TYPES,
  POST_IMAGES_MAX_FILE_SIZE,
  POST_IMAGES_MAX_MEGAPIXELS,
  POST_IMAGE_STORAGE_PATH_REGEX,
  buildPostImageStoragePath,
  isAllowedPostImageMimeType,
  validatePostImageBinarySignature,
} from './post-image-validation';

describe('POST_IMAGES_* constants', () => {
  it('allow-list contains only the three accepted MIME types', () => {
    // Hard rule: SVG is intentionally excluded (XSS vector).
    expect([...POST_IMAGES_ALLOWED_MIME_TYPES]).toEqual(['image/jpeg', 'image/png', 'image/webp']);
  });

  it('per-image cap is 2 MiB', () => {
    expect(POST_IMAGES_MAX_FILE_SIZE).toBe(2 * 1024 * 1024);
  });

  it('megapixel cap is 50 MP', () => {
    expect(POST_IMAGES_MAX_MEGAPIXELS).toBe(50_000_000);
  });

  it('per-post cap is 3', () => {
    expect(MAX_IMAGES_PER_POST).toBe(3);
  });
});

describe('isAllowedPostImageMimeType', () => {
  it.each(['image/jpeg', 'image/png', 'image/webp'])('accepts %s', (mime) => {
    expect(isAllowedPostImageMimeType(mime)).toBe(true);
  });

  it.each([
    'image/svg+xml',
    'image/gif',
    'image/avif',
    'application/octet-stream',
    'text/plain',
    'image/jpeg; charset=utf-8',
    '',
    'IMAGE/JPEG',
    null,
    undefined,
    {},
  ])('rejects %p', (value) => {
    expect(isAllowedPostImageMimeType(value)).toBe(false);
  });
});

describe('validatePostImageBinarySignature', () => {
  function bufferOf(bytes: number[]): ArrayBuffer {
    return new Uint8Array(bytes).buffer;
  }

  it('accepts a JPEG starting with FF D8 FF', () => {
    const buf = bufferOf([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(validatePostImageBinarySignature(buf, 'image/jpeg')).toBe(true);
  });

  it('rejects a JPEG-claimed buffer that does not start with FF D8 FF', () => {
    const buf = bufferOf([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(validatePostImageBinarySignature(buf, 'image/jpeg')).toBe(false);
  });

  it('accepts a full PNG signature (8 bytes)', () => {
    const buf = bufferOf([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
    expect(validatePostImageBinarySignature(buf, 'image/png')).toBe(true);
  });

  it('rejects a PNG-claimed buffer with only a partial signature', () => {
    // Only the first 4 bytes (PNG \r\n missing 1A 0A): an old-style check
    // would accept; the current full-8-byte check must reject.
    const buf = bufferOf([0x89, 0x50, 0x4e, 0x47, 0x00, 0x00, 0x00, 0x00, 0, 0, 0, 0]);
    expect(validatePostImageBinarySignature(buf, 'image/png')).toBe(false);
  });

  it('accepts a WebP that starts with RIFF...WEBP', () => {
    const buf = bufferOf([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
    expect(validatePostImageBinarySignature(buf, 'image/webp')).toBe(true);
  });

  it('rejects a WebP-claimed buffer that lacks RIFF', () => {
    const buf = bufferOf([0x00, 0x00, 0x00, 0x00, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
    expect(validatePostImageBinarySignature(buf, 'image/webp')).toBe(false);
  });

  it('rejects a buffer claiming SVG (the function has no SVG branch)', () => {
    const svg = new TextEncoder().encode('<?xml version="1.0"?><svg></svg>').buffer;
    expect(validatePostImageBinarySignature(svg, 'image/svg+xml')).toBe(false);
  });

  it('rejects a JPEG payload declared as PNG (cross-MIME spoofing)', () => {
    const jpegBytes = bufferOf([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(validatePostImageBinarySignature(jpegBytes, 'image/png')).toBe(false);
  });
});

describe('buildPostImageStoragePath', () => {
  const userId = '11111111-1111-1111-1111-111111111111';
  const postId = '22222222-2222-2222-2222-222222222222';
  const randomUuid = '33333333-3333-3333-3333-333333333333';

  it('builds the canonical layout for jpeg', () => {
    expect(
      buildPostImageStoragePath({ userId, postId, randomUuid, contentType: 'image/jpeg' })
    ).toBe(`${userId}/${postId}/${randomUuid}.jpg`);
  });

  it('builds the canonical layout for png', () => {
    expect(
      buildPostImageStoragePath({ userId, postId, randomUuid, contentType: 'image/png' })
    ).toBe(`${userId}/${postId}/${randomUuid}.png`);
  });

  it('builds the canonical layout for webp', () => {
    expect(
      buildPostImageStoragePath({ userId, postId, randomUuid, contentType: 'image/webp' })
    ).toBe(`${userId}/${postId}/${randomUuid}.webp`);
  });

  it('throws on a non-uuid userId (path-traversal defense)', () => {
    expect(() =>
      buildPostImageStoragePath({
        userId: '../etc/passwd',
        postId,
        randomUuid,
        contentType: 'image/png',
      })
    ).toThrow();
  });

  it('throws on a non-uuid postId (cross-post leak defense)', () => {
    expect(() =>
      buildPostImageStoragePath({
        userId,
        postId: '../shared',
        randomUuid,
        contentType: 'image/png',
      })
    ).toThrow();
  });

  it('throws on a non-uuid randomUuid (predictability defense)', () => {
    expect(() =>
      buildPostImageStoragePath({
        userId,
        postId,
        randomUuid: 'predictable',
        contentType: 'image/png',
      })
    ).toThrow();
  });

  it('every output matches POST_IMAGE_STORAGE_PATH_REGEX', () => {
    const path = buildPostImageStoragePath({
      userId,
      postId,
      randomUuid,
      contentType: 'image/webp',
    });
    expect(POST_IMAGE_STORAGE_PATH_REGEX.test(path)).toBe(true);
  });
});

describe('POST_IMAGE_STORAGE_PATH_REGEX (path-traversal coverage)', () => {
  const userId = '11111111-1111-1111-1111-111111111111';
  const postId = '22222222-2222-2222-2222-222222222222';
  const randomUuid = '33333333-3333-3333-3333-333333333333';

  it('accepts canonical jpg/png/webp paths', () => {
    for (const ext of ['jpg', 'png', 'webp']) {
      expect(POST_IMAGE_STORAGE_PATH_REGEX.test(`${userId}/${postId}/${randomUuid}.${ext}`)).toBe(
        true
      );
    }
  });

  it.each([
    `../${postId}/${randomUuid}.jpg`,
    `${userId}/../${randomUuid}.jpg`,
    `${userId}/${postId}/../${randomUuid}.jpg`,
    `${userId}/${postId}/${randomUuid}.jpeg`, // wrong extension
    `${userId}/${postId}/${randomUuid}.svg`, // SVG hard reject
    `${userId}/${postId}/${randomUuid}.JPG`, // upper-case extension
    `${userId}/${postId}/${randomUuid}`, // missing extension
    `/${userId}/${postId}/${randomUuid}.jpg`, // leading slash
    `${userId}/${postId}/${randomUuid}.jpg/`, // trailing slash
    `${userId}//${randomUuid}.jpg`, // empty post segment
    `${userId}/${postId}/sub/${randomUuid}.jpg`, // extra segment
    `OTHERUSER-${userId.slice(8)}/${postId}/${randomUuid}.jpg`, // invalid uuid
    'test', // wholly invalid
    '',
  ])('rejects unsafe path %p', (input) => {
    expect(POST_IMAGE_STORAGE_PATH_REGEX.test(input)).toBe(false);
  });
});
