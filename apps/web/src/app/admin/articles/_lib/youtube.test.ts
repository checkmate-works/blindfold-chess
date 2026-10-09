import { describe, expect, it } from 'vitest';

import { extractYouTubeVideoId, normalizeYouTubeSrc } from './youtube';

describe('extractYouTubeVideoId', () => {
  it('should extract video ID from standard watch URL', () => {
    expect(extractYouTubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(
      'dQw4w9WgXcQ'
    );
  });

  it('should extract video ID from watch URL with extra params', () => {
    expect(
      extractYouTubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s&list=PLxyz')
    ).toBe('dQw4w9WgXcQ');
  });

  it('should extract video ID from embed URL', () => {
    expect(extractYouTubeVideoId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('should extract video ID from privacy-enhanced embed URL', () => {
    expect(extractYouTubeVideoId('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ')).toBe(
      'dQw4w9WgXcQ'
    );
  });

  it('should extract video ID from short URL (youtu.be)', () => {
    expect(extractYouTubeVideoId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('should extract video ID from shorts URL', () => {
    expect(extractYouTubeVideoId('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('should return null for invalid URL', () => {
    expect(extractYouTubeVideoId('not-a-url')).toBeNull();
  });

  it('should return null for non-YouTube URL', () => {
    expect(extractYouTubeVideoId('https://example.com/watch?v=abc')).toBeNull();
  });

  it('should return null for empty string', () => {
    expect(extractYouTubeVideoId('')).toBeNull();
  });

  it('should handle video ID with hyphens and underscores', () => {
    expect(extractYouTubeVideoId('https://www.youtube.com/watch?v=a-B_c1D2e3F')).toBe(
      'a-B_c1D2e3F'
    );
  });

  it('should extract video ID from live URL', () => {
    expect(extractYouTubeVideoId('https://www.youtube.com/live/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('should ignore surrounding whitespace', () => {
    expect(extractYouTubeVideoId('  https://youtu.be/dQw4w9WgXcQ\n')).toBe('dQw4w9WgXcQ');
  });

  it.each([
    ['http scheme', 'http://www.youtube.com/watch?v=dQw4w9WgXcQ'],
    ['scheme-less URL', 'youtu.be/dQw4w9WgXcQ'],
    ['mobile host', 'https://m.youtube.com/watch?v=dQw4w9WgXcQ'],
    ['nocookie host without www', 'https://youtube-nocookie.com/embed/dQw4w9WgXcQ'],
    ['fragment', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ#t=10'],
    ['id shorter than 11 characters', 'https://www.youtube.com/watch?v=abc'],
    ['YouTube host named only in the query', 'https://evil.example/?x=youtube.com&v=dQw4w9WgXcQ'],
  ])('should return null for %s', (_label, src) => {
    expect(extractYouTubeVideoId(src)).toBeNull();
  });
});

describe('normalizeYouTubeSrc', () => {
  it('should return the WHATWG-canonical URL for an accepted URL', () => {
    expect(normalizeYouTubeSrc(' https://WWW.YouTube.com/watch?v=dQw4w9WgXcQ&t=42s ')).toBe(
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s'
    );
  });

  it('should return null for a rejected URL', () => {
    expect(normalizeYouTubeSrc('http://youtu.be/dQw4w9WgXcQ')).toBeNull();
  });
});
