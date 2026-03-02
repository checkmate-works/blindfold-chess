import { describe, expect, it } from 'vitest';

import { escapeHtml } from './escape-html';

describe('escapeHtml', () => {
  it('should escape ampersand', () => {
    expect(escapeHtml('a & b')).toBe('a &amp; b');
  });

  it('should escape less-than', () => {
    expect(escapeHtml('<script>')).toBe('&lt;script&gt;');
  });

  it('should escape greater-than', () => {
    expect(escapeHtml('a > b')).toBe('a &gt; b');
  });

  it('should escape double quotes', () => {
    expect(escapeHtml('"hello"')).toBe('&quot;hello&quot;');
  });

  it('should escape single quotes', () => {
    expect(escapeHtml("it's")).toBe('it&#x27;s');
  });

  it('should escape all special characters in a mixed string', () => {
    expect(escapeHtml('<img src="x" onerror=\'alert(1)\'>')).toBe(
      '&lt;img src=&quot;x&quot; onerror=&#x27;alert(1)&#x27;&gt;'
    );
  });

  it('should return the same string when no special characters', () => {
    expect(escapeHtml('Hello World 123')).toBe('Hello World 123');
  });

  it('should handle empty string', () => {
    expect(escapeHtml('')).toBe('');
  });

  it('should double-escape already-escaped entities', () => {
    expect(escapeHtml('&amp;')).toBe('&amp;amp;');
    expect(escapeHtml('&lt;')).toBe('&amp;lt;');
  });

  it('should handle consecutive special characters', () => {
    expect(escapeHtml('&&<<>>')).toBe('&amp;&amp;&lt;&lt;&gt;&gt;');
  });

  it('should pass through unicode characters unchanged', () => {
    expect(escapeHtml('Hello \u4e16\u754c \u2603')).toBe('Hello \u4e16\u754c \u2603');
  });

  it('should preserve whitespace characters', () => {
    expect(escapeHtml('line1\nline2\ttab')).toBe('line1\nline2\ttab');
  });

  it('should handle string with only special characters', () => {
    expect(escapeHtml('<>&"\'')).toBe('&lt;&gt;&amp;&quot;&#x27;');
  });
});
