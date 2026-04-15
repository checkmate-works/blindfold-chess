import { describe, expect, it } from 'vitest';

import {
  type LinkSegment,
  buildCushionPageUrl,
  isDangerousUrl,
  isInternalUrl,
  linkifyText,
} from './linkify-urls';

describe('isInternalUrl', () => {
  it('should return true for the main domain', () => {
    expect(isInternalUrl('https://blindfold-chess.online/topics')).toBe(true);
  });

  it('should return true for the www subdomain', () => {
    expect(isInternalUrl('https://www.blindfold-chess.online/topics')).toBe(true);
  });

  it('should return false for external domains', () => {
    expect(isInternalUrl('https://example.com')).toBe(false);
    expect(isInternalUrl('https://lichess.org')).toBe(false);
  });

  it('should return false for invalid URLs', () => {
    expect(isInternalUrl('not-a-url')).toBe(false);
  });

  it('should return false for empty string', () => {
    expect(isInternalUrl('')).toBe(false);
  });

  it('should be case-insensitive for hostname', () => {
    expect(isInternalUrl('https://BLINDFOLD-CHESS.ONLINE/topics')).toBe(true);
    expect(isInternalUrl('https://Www.Blindfold-Chess.Online/')).toBe(true);
  });

  it('should return false for domains that contain the site domain as substring', () => {
    expect(isInternalUrl('https://evil-blindfold-chess.online')).toBe(false);
    expect(isInternalUrl('https://blindfold-chess.online.evil.com')).toBe(false);
  });

  it('should return false for non-www subdomains', () => {
    expect(isInternalUrl('https://api.blindfold-chess.online')).toBe(false);
    expect(isInternalUrl('https://admin.blindfold-chess.online')).toBe(false);
  });

  it('should handle URLs with port numbers', () => {
    // URL with port - hostname still matches but port makes it different
    expect(isInternalUrl('https://blindfold-chess.online:8080/topics')).toBe(true);
  });

  it('should handle URLs with authentication info', () => {
    expect(isInternalUrl('https://user:pass@blindfold-chess.online/')).toBe(true);
  });
});

describe('isDangerousUrl', () => {
  it('should return true for javascript: scheme', () => {
    expect(isDangerousUrl('javascript:alert(1)')).toBe(true);
  });

  it('should return true for data: scheme', () => {
    expect(isDangerousUrl('data:text/html,<script>alert(1)</script>')).toBe(true);
  });

  it('should return true for vbscript: scheme', () => {
    expect(isDangerousUrl('vbscript:MsgBox("xss")')).toBe(true);
  });

  it('should return true for file: scheme', () => {
    expect(isDangerousUrl('file:///etc/passwd')).toBe(true);
  });

  it('should return false for http: and https:', () => {
    expect(isDangerousUrl('http://example.com')).toBe(false);
    expect(isDangerousUrl('https://example.com')).toBe(false);
  });

  it('should handle leading whitespace', () => {
    expect(isDangerousUrl('  javascript:alert(1)')).toBe(true);
  });

  it('should be case-insensitive for scheme detection', () => {
    expect(isDangerousUrl('JaVaScRiPt:alert(1)')).toBe(true);
    expect(isDangerousUrl('DATA:text/html,<h1>xss</h1>')).toBe(true);
    expect(isDangerousUrl('VBSCRIPT:MsgBox("xss")')).toBe(true);
    expect(isDangerousUrl('FILE:///etc/passwd')).toBe(true);
  });

  it('should return false for empty string', () => {
    expect(isDangerousUrl('')).toBe(false);
  });

  it('should return false for strings that contain dangerous scheme but not at start', () => {
    expect(isDangerousUrl('https://example.com?redirect=javascript:alert(1)')).toBe(false);
  });

  it('should handle tabs and newlines in leading whitespace', () => {
    expect(isDangerousUrl('\t\njavascript:alert(1)')).toBe(true);
  });
});

describe('linkifyText', () => {
  it('should return text-only segment for text without URLs', () => {
    const result = linkifyText('Hello, world!');
    expect(result).toEqual([{ type: 'text', value: 'Hello, world!' }]);
  });

  it('should detect a single URL', () => {
    const result = linkifyText('Check out https://example.com for more info');
    expect(result).toEqual([
      { type: 'text', value: 'Check out ' },
      {
        type: 'link',
        href: 'https://example.com',
        display: 'https://example.com',
        isExternal: true,
      },
      { type: 'text', value: ' for more info' },
    ]);
  });

  it('should detect multiple URLs', () => {
    const result = linkifyText('Visit https://example.com and https://lichess.org');
    expect(result).toHaveLength(4);
    expect(result[1]).toEqual({
      type: 'link',
      href: 'https://example.com',
      display: 'https://example.com',
      isExternal: true,
    });
    expect(result[3]).toEqual({
      type: 'link',
      href: 'https://lichess.org',
      display: 'https://lichess.org',
      isExternal: true,
    });
  });

  it('should mark internal URLs correctly', () => {
    const result = linkifyText('See https://www.blindfold-chess.online/topics');
    const link = result.find((s): s is Extract<LinkSegment, { type: 'link' }> => s.type === 'link');
    expect(link?.isExternal).toBe(false);
  });

  it('should handle URL at the start of text', () => {
    const result = linkifyText('https://example.com is a good site');
    expect(result[0]).toEqual({
      type: 'link',
      href: 'https://example.com',
      display: 'https://example.com',
      isExternal: true,
    });
  });

  it('should handle URL at the end of text', () => {
    const result = linkifyText('Go to https://example.com');
    expect(result).toHaveLength(2);
    expect(result[1]).toEqual({
      type: 'link',
      href: 'https://example.com',
      display: 'https://example.com',
      isExternal: true,
    });
  });

  it('should handle text that is just a URL', () => {
    const result = linkifyText('https://example.com');
    expect(result).toEqual([
      {
        type: 'link',
        href: 'https://example.com',
        display: 'https://example.com',
        isExternal: true,
      },
    ]);
  });

  it('should not linkify dangerous schemes', () => {
    const result = linkifyText('javascript:alert(1)');
    expect(result).toEqual([{ type: 'text', value: 'javascript:alert(1)' }]);
  });

  it('should return empty array for empty string', () => {
    const result = linkifyText('');
    expect(result).toEqual([]);
  });

  it('should handle URLs with paths and query strings', () => {
    const result = linkifyText('Visit https://example.com/path?q=test&foo=bar#section');
    const link = result.find((s): s is Extract<LinkSegment, { type: 'link' }> => s.type === 'link');
    expect(link?.href).toBe('https://example.com/path?q=test&foo=bar#section');
  });

  it('should handle http URLs', () => {
    const result = linkifyText('Visit http://example.com');
    const link = result.find((s): s is Extract<LinkSegment, { type: 'link' }> => s.type === 'link');
    expect(link?.href).toBe('http://example.com');
  });

  it('should not include trailing punctuation', () => {
    const result = linkifyText('Check https://example.com.');
    const link = result.find((s): s is Extract<LinkSegment, { type: 'link' }> => s.type === 'link');
    expect(link?.href).toBe('https://example.com');
  });

  it('should handle URL followed by Japanese period', () => {
    const result = linkifyText('https://example.com\u3002');
    const link = result.find((s): s is Extract<LinkSegment, { type: 'link' }> => s.type === 'link');
    expect(link?.href).toBe('https://example.com');
  });

  it('should handle URL in parentheses', () => {
    const result = linkifyText('(https://example.com)');
    const link = result.find((s): s is Extract<LinkSegment, { type: 'link' }> => s.type === 'link');
    expect(link?.href).toBe('https://example.com');
  });

  it('should stop URL at adjacent Japanese text (hiragana/katakana/kanji)', () => {
    const result = linkifyText('詳しくはhttps://example.comをご覧ください');
    const link = result.find((s): s is Extract<LinkSegment, { type: 'link' }> => s.type === 'link');
    expect(link).toBeDefined();
    expect(link?.href).toBe('https://example.com');
  });

  it('should correctly handle URL with space before Japanese text', () => {
    const result = linkifyText('詳しくは https://example.com をご覧ください');
    const link = result.find((s): s is Extract<LinkSegment, { type: 'link' }> => s.type === 'link');
    expect(link).toBeDefined();
    expect(link?.href).toBe('https://example.com');
  });

  it('should handle URL followed by Japanese comma', () => {
    const result = linkifyText('https://example.com、こちらもどうぞ');
    const link = result.find((s): s is Extract<LinkSegment, { type: 'link' }> => s.type === 'link');
    expect(link?.href).toBe('https://example.com');
  });

  it('should stop URL before Japanese text followed by fullwidth exclamation', () => {
    const result = linkifyText('https://example.comを見て！');
    const link = result.find((s): s is Extract<LinkSegment, { type: 'link' }> => s.type === 'link');
    expect(link?.href).toBe('https://example.com');
  });

  it('should stop URL before Japanese text followed by fullwidth question mark', () => {
    const result = linkifyText('https://example.comですか？');
    const link = result.find((s): s is Extract<LinkSegment, { type: 'link' }> => s.type === 'link');
    expect(link?.href).toBe('https://example.com');
  });

  it('should correctly stop at fullwidth exclamation when directly after URL', () => {
    const result = linkifyText('https://example.com！すごい');
    const link = result.find((s): s is Extract<LinkSegment, { type: 'link' }> => s.type === 'link');
    expect(link?.href).toBe('https://example.com');
  });

  it('should correctly stop at fullwidth question mark when directly after URL', () => {
    const result = linkifyText('https://example.com？どう思う');
    const link = result.find((s): s is Extract<LinkSegment, { type: 'link' }> => s.type === 'link');
    expect(link?.href).toBe('https://example.com');
  });

  it('should handle URL followed by fullwidth semicolon', () => {
    const result = linkifyText('https://example.com；次のURL');
    const link = result.find((s): s is Extract<LinkSegment, { type: 'link' }> => s.type === 'link');
    expect(link?.href).toBe('https://example.com');
  });

  it('should handle text with newlines containing URLs', () => {
    const result = linkifyText('First line\nhttps://example.com\nThird line');
    const link = result.find((s): s is Extract<LinkSegment, { type: 'link' }> => s.type === 'link');
    expect(link?.href).toBe('https://example.com');
  });

  it('should not detect ftp:// URLs', () => {
    const result = linkifyText('Visit ftp://files.example.com');
    expect(result).toEqual([{ type: 'text', value: 'Visit ftp://files.example.com' }]);
  });

  it('should not detect bare domain without scheme', () => {
    const result = linkifyText('Visit example.com for more info');
    expect(result).toEqual([{ type: 'text', value: 'Visit example.com for more info' }]);
  });

  it('should handle multiple trailing punctuation marks', () => {
    const result = linkifyText('See https://example.com...');
    const link = result.find((s): s is Extract<LinkSegment, { type: 'link' }> => s.type === 'link');
    expect(link?.href).toBe('https://example.com');
  });

  it('should handle URL followed by closing bracket and period', () => {
    const result = linkifyText('[https://example.com].');
    const link = result.find((s): s is Extract<LinkSegment, { type: 'link' }> => s.type === 'link');
    expect(link?.href).toBe('https://example.com');
  });

  it('should handle URL with encoded characters', () => {
    const result = linkifyText('https://example.com/path%20with%20spaces');
    const link = result.find((s): s is Extract<LinkSegment, { type: 'link' }> => s.type === 'link');
    expect(link?.href).toBe('https://example.com/path%20with%20spaces');
  });

  it('should handle URLs separated only by whitespace', () => {
    const result = linkifyText('https://example.com https://lichess.org');
    const links = result.filter(
      (s): s is Extract<LinkSegment, { type: 'link' }> => s.type === 'link'
    );
    expect(links).toHaveLength(2);
    expect(links[0].href).toBe('https://example.com');
    expect(links[1].href).toBe('https://lichess.org');
  });

  it('should handle URL with port number', () => {
    const result = linkifyText('Visit https://example.com:8080/path');
    const link = result.find((s): s is Extract<LinkSegment, { type: 'link' }> => s.type === 'link');
    expect(link?.href).toBe('https://example.com:8080/path');
  });

  it('should handle URL stopped by fullwidth space', () => {
    const result = linkifyText('https://example.com\u3000次のテキスト');
    const link = result.find((s): s is Extract<LinkSegment, { type: 'link' }> => s.type === 'link');
    expect(link?.href).toBe('https://example.com');
  });

  it('should handle URL stopped by angle bracket', () => {
    const result = linkifyText('<https://example.com>');
    const link = result.find((s): s is Extract<LinkSegment, { type: 'link' }> => s.type === 'link');
    expect(link?.href).toBe('https://example.com');
  });

  it('should handle URL stopped by double quote', () => {
    const result = linkifyText('"https://example.com"');
    const link = result.find((s): s is Extract<LinkSegment, { type: 'link' }> => s.type === 'link');
    expect(link?.href).toBe('https://example.com');
  });

  it('should handle URL stopped by single quote', () => {
    const result = linkifyText("'https://example.com'");
    const link = result.find((s): s is Extract<LinkSegment, { type: 'link' }> => s.type === 'link');
    expect(link?.href).toBe('https://example.com');
  });

  it('should handle whitespace-only string', () => {
    const result = linkifyText('   ');
    expect(result).toEqual([{ type: 'text', value: '   ' }]);
  });

  it('should preserve surrounding text segments correctly with multiple URLs', () => {
    const result = linkifyText('See https://a.com and https://b.com here');
    expect(result).toEqual([
      { type: 'text', value: 'See ' },
      { type: 'link', href: 'https://a.com', display: 'https://a.com', isExternal: true },
      { type: 'text', value: ' and ' },
      { type: 'link', href: 'https://b.com', display: 'https://b.com', isExternal: true },
      { type: 'text', value: ' here' },
    ]);
  });

  it('should set display equal to href', () => {
    const result = linkifyText('https://example.com/long/path?q=1');
    const link = result.find((s): s is Extract<LinkSegment, { type: 'link' }> => s.type === 'link');
    expect(link?.display).toBe(link?.href);
  });
});

describe('buildCushionPageUrl', () => {
  it('should encode the external URL', () => {
    const result = buildCushionPageUrl('https://example.com/path?q=1', 'en');
    expect(result).toBe('/en/redirect?url=https%3A%2F%2Fexample.com%2Fpath%3Fq%3D1');
  });

  it('should use the provided locale', () => {
    const result = buildCushionPageUrl('https://example.com', 'ja');
    expect(result).toBe('/ja/redirect?url=https%3A%2F%2Fexample.com');
  });

  it('should encode URLs with Japanese characters', () => {
    const result = buildCushionPageUrl('https://example.com/検索', 'ja');
    expect(result).toContain('/ja/redirect?url=');
    expect(result).toBe(`/ja/redirect?url=${encodeURIComponent('https://example.com/検索')}`);
  });

  it('should encode URLs with special characters', () => {
    const result = buildCushionPageUrl('https://example.com/path?a=1&b=2#hash', 'en');
    const decoded = decodeURIComponent(result.replace('/en/redirect?url=', ''));
    expect(decoded).toBe('https://example.com/path?a=1&b=2#hash');
  });

  it('should produce decodable URLs', () => {
    const original = 'https://example.com/path?q=hello world&foo=bar';
    const result = buildCushionPageUrl(original, 'en');
    const urlParam = result.split('url=')[1];
    expect(decodeURIComponent(urlParam)).toBe(original);
  });
});
