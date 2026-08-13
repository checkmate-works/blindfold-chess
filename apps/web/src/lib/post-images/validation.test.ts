import { describe, expect, it } from 'vitest';

import {
  MAX_IMAGES_PER_POST,
  POST_IMAGES_ALLOWED_MIME_TYPES,
  POST_IMAGES_MAX_FILE_SIZE,
  POST_IMAGES_MAX_MEGAPIXELS,
  POST_IMAGE_STORAGE_PATH_REGEX,
  buildPostImageStoragePath,
  isAllowedPostImageMimeType,
} from './validation';

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

// The magic-byte cases moved to `lib/images/binary-signature.test.ts` when
// the post and admin upload paths were collapsed onto one implementation.

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
