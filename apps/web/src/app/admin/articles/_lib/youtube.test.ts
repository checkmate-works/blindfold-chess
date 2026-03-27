import { describe, expect, it } from 'vitest';

import { extractYouTubeVideoId } from './youtube';

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
});
