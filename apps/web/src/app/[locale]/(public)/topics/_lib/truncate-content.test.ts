import { describe, expect, it } from 'vitest';

import { truncateContent } from './truncate-content';

describe('truncateContent', () => {
  it('should return content as-is when shorter than 200 characters', () => {
    const content = 'a'.repeat(100);
    expect(truncateContent(content)).toBe(content);
  });

  it('should return content as-is when exactly 200 characters', () => {
    const content = 'a'.repeat(200);
    expect(truncateContent(content)).toBe(content);
  });

  it('should truncate to 200 characters with ellipsis when 201 characters', () => {
    const content = 'a'.repeat(201);
    expect(truncateContent(content)).toBe('a'.repeat(200) + '...');
  });

  it('should truncate very long content (5000 characters)', () => {
    const content = 'x'.repeat(5000);
    const result = truncateContent(content);
    expect(result).toBe('x'.repeat(200) + '...');
    expect(result.length).toBe(203);
  });

  it('should return empty string as-is', () => {
    expect(truncateContent('')).toBe('');
  });

  it('should respect custom maxLength parameter', () => {
    const content = 'abcdefghij'; // 10 chars
    expect(truncateContent(content, 5)).toBe('abcde...');
  });

  it('should return content as-is when length equals custom maxLength', () => {
    const content = 'abcde'; // 5 chars
    expect(truncateContent(content, 5)).toBe('abcde');
  });

  it('should not truncate when content is shorter than custom maxLength', () => {
    const content = 'abc'; // 3 chars
    expect(truncateContent(content, 5)).toBe('abc');
  });

  it('should handle multibyte characters (Japanese)', () => {
    const content = 'あ'.repeat(201);
    const result = truncateContent(content);
    expect(result).toBe('あ'.repeat(200) + '...');
  });

  it('should handle multibyte characters (emoji)', () => {
    // Emoji '😀' has .length of 2 (surrogate pair), so 201 emojis = 402 JS length.
    // slice(0, 200) yields exactly 100 emojis (200 / 2).
    const content = '😀'.repeat(201);
    const result = truncateContent(content);
    expect(result).toBe('😀'.repeat(100) + '...');
  });

  it('should trim trailing spaces at the truncation point', () => {
    // 198 chars + 2 spaces + more content = truncates at 200 which includes trailing spaces
    const content = 'a'.repeat(198) + '  ' + 'b'.repeat(100);
    const result = truncateContent(content);
    // slice(0, 200) gives 198 'a's + 2 spaces, trimEnd() removes trailing spaces
    expect(result).toBe('a'.repeat(198) + '...');
  });

  it('should trim trailing spaces when truncation lands in the middle of whitespace', () => {
    const content = 'a'.repeat(195) + '     ' + 'b'.repeat(100);
    const result = truncateContent(content);
    // slice(0, 200) gives 195 'a's + 5 spaces, trimEnd() removes the spaces
    expect(result).toBe('a'.repeat(195) + '...');
  });

  it('should not trim spaces when content is not truncated', () => {
    const content = 'hello   ';
    expect(truncateContent(content)).toBe('hello   ');
  });

  it('should handle content that is all whitespace and longer than maxLength', () => {
    const content = ' '.repeat(300);
    const result = truncateContent(content);
    // slice(0, 200) gives 200 spaces, trimEnd() removes all → empty string + '...'
    expect(result).toBe('...');
  });

  it('should handle maxLength of 0', () => {
    const content = 'hello';
    expect(truncateContent(content, 0)).toBe('...');
  });

  it('should handle maxLength of 1', () => {
    const content = 'hello';
    expect(truncateContent(content, 1)).toBe('h...');
  });

  it('should handle single character content within limit', () => {
    expect(truncateContent('a')).toBe('a');
  });

  it('should handle mixed ASCII and multibyte content', () => {
    // Build a string with mixed characters that exceeds 200
    const content = 'Hello世界'.repeat(50); // 5*50 = 250 characters (each char is 1 JS length)
    const result = truncateContent(content);
    expect(result).toBe(content.slice(0, 200) + '...');
  });
});
