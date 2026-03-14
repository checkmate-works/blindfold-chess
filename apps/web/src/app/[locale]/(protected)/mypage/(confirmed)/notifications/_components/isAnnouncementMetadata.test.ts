import { describe, expect, it } from 'vitest';

/**
 * Tests for the isAnnouncementMetadata type guard logic.
 *
 * The actual function is defined locally in NotificationItem.tsx and is not exported.
 * We replicate its logic here to verify edge case behavior.
 * If the implementation changes, these tests should be updated accordingly.
 */
type AnnouncementMetadata = { slug: string; title: string };

function isAnnouncementMetadata(m: unknown): m is AnnouncementMetadata {
  return typeof m === 'object' && m !== null && 'slug' in m && 'title' in m;
}

describe('isAnnouncementMetadata', () => {
  it('should return true for valid metadata with slug and title', () => {
    expect(isAnnouncementMetadata({ slug: 'my-post', title: 'My Post' })).toBe(true);
  });

  it('should return true for metadata with extra properties', () => {
    expect(isAnnouncementMetadata({ slug: 'x', title: 'y', extra: 123 })).toBe(true);
  });

  it('should return false for null', () => {
    expect(isAnnouncementMetadata(null)).toBe(false);
  });

  it('should return false for undefined', () => {
    expect(isAnnouncementMetadata(undefined)).toBe(false);
  });

  it('should return false for a string', () => {
    expect(isAnnouncementMetadata('hello')).toBe(false);
  });

  it('should return false for a number', () => {
    expect(isAnnouncementMetadata(42)).toBe(false);
  });

  it('should return false for a boolean', () => {
    expect(isAnnouncementMetadata(true)).toBe(false);
  });

  it('should return false for an empty object', () => {
    expect(isAnnouncementMetadata({})).toBe(false);
  });

  it('should return false when slug is missing', () => {
    expect(isAnnouncementMetadata({ title: 'My Post' })).toBe(false);
  });

  it('should return false when title is missing', () => {
    expect(isAnnouncementMetadata({ slug: 'my-post' })).toBe(false);
  });

  it('should return true when slug and title have empty string values', () => {
    // The type guard only checks property existence via `in`, not value validity
    expect(isAnnouncementMetadata({ slug: '', title: '' })).toBe(true);
  });

  it('should return true when slug and title have non-string values', () => {
    // The type guard checks property existence, not value types
    expect(isAnnouncementMetadata({ slug: 123, title: null })).toBe(true);
  });

  it('should return false for an array', () => {
    expect(isAnnouncementMetadata([])).toBe(false);
  });

  it('should return false for an array with slug and title indices', () => {
    // Arrays are objects but lack 'slug' and 'title' keys
    const arr = [1, 2];
    expect(isAnnouncementMetadata(arr)).toBe(false);
  });

  it('should return true for an array with slug and title properties', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const arr: any = [];
    arr.slug = 'x';
    arr.title = 'y';
    // Arrays with named properties pass the `in` check
    expect(isAnnouncementMetadata(arr)).toBe(true);
  });

  it('should return false for a function', () => {
    expect(isAnnouncementMetadata(() => {})).toBe(false);
  });

  it('should return true for a Date-like object with slug and title', () => {
    const d = new Date();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (d as any).slug = 'x';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (d as any).title = 'y';
    expect(isAnnouncementMetadata(d)).toBe(true);
  });
});
