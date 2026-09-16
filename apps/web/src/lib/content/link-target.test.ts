import { describe, expect, it } from 'vitest';

import { MAX_LINK_HREF_LENGTH, classifyLinkTarget } from './link-target';

const siteRelative = { allowSiteRelative: true } as const;

describe('classifyLinkTarget', () => {
  describe('absolute http(s) URLs', () => {
    it('classifies another host as external', () => {
      expect(classifyLinkTarget('https://example.com/x')).toBe('external');
      expect(classifyLinkTarget('http://example.com/x')).toBe('external');
    });

    it('classifies the site domain as internal', () => {
      expect(classifyLinkTarget('https://blindfold-chess.online/topics')).toBe('internal');
      expect(classifyLinkTarget('https://www.blindfold-chess.online/topics')).toBe('internal');
    });

    it('accepts an upper-case scheme the way a browser does', () => {
      expect(classifyLinkTarget('HTTPS://evil.example/x')).toBe('external');
      expect(classifyLinkTarget('HtTp://evil.example/x')).toBe('external');
      expect(classifyLinkTarget('HTTPS://www.blindfold-chess.online/topics')).toBe('internal');
    });

    it('ignores surrounding whitespace', () => {
      expect(classifyLinkTarget('  https://example.com/x  ')).toBe('external');
    });
  });

  describe('protocol-relative and scheme-smuggling hrefs', () => {
    it('rejects a protocol-relative URL even though it starts with a slash', () => {
      expect(classifyLinkTarget('//evil.example/x', siteRelative)).toBe('unsafe');
      expect(classifyLinkTarget('//evil.example/x')).toBe('unsafe');
    });

    it('rejects a backslash spelling of a protocol-relative URL', () => {
      // The URL parser folds `\` into `/` for http(s), so `/\host` is `//host`.
      expect(classifyLinkTarget('/\\evil.example/x', siteRelative)).toBe('unsafe');
      expect(classifyLinkTarget('\\\\evil.example/x', siteRelative)).toBe('unsafe');
    });

    it('rejects slashes separated by characters the parser strips', () => {
      expect(classifyLinkTarget('/\t/evil.example/x', siteRelative)).toBe('unsafe');
      expect(classifyLinkTarget('/\n/evil.example/x', siteRelative)).toBe('unsafe');
    });
  });

  describe('executable schemes', () => {
    it('rejects javascript:', () => {
      expect(classifyLinkTarget('javascript:alert(1)')).toBe('unsafe');
      expect(classifyLinkTarget('javascript:alert(1)', siteRelative)).toBe('unsafe');
      expect(classifyLinkTarget('JaVaScRiPt:alert(1)', siteRelative)).toBe('unsafe');
      expect(classifyLinkTarget('  javascript:alert(1)', siteRelative)).toBe('unsafe');
    });

    it('rejects the other schemes that can execute or read local state', () => {
      expect(classifyLinkTarget('data:text/html,<script>alert(1)</script>')).toBe('unsafe');
      expect(classifyLinkTarget('vbscript:MsgBox("xss")')).toBe('unsafe');
      expect(classifyLinkTarget('file:///etc/passwd')).toBe('unsafe');
    });

    it('rejects other non-web schemes', () => {
      expect(classifyLinkTarget('mailto:someone@example.com')).toBe('unsafe');
      expect(classifyLinkTarget('ftp://example.com/x')).toBe('unsafe');
    });
  });

  describe('site-relative hrefs', () => {
    it('classifies a root-relative path as internal only when allowed', () => {
      expect(classifyLinkTarget('/ja/learn', siteRelative)).toBe('internal');
      expect(classifyLinkTarget('/ja/learn')).toBe('unsafe');
    });

    it('classifies a fragment as internal only when allowed', () => {
      expect(classifyLinkTarget('#anchor', siteRelative)).toBe('internal');
      expect(classifyLinkTarget('#anchor')).toBe('unsafe');
    });

    it('keeps a root-relative path with a query and fragment internal', () => {
      expect(classifyLinkTarget('/topics?page=2#top', siteRelative)).toBe('internal');
    });

    it('rejects a document-relative path', () => {
      // Nothing unsafe about `learn/basics`, but no surface authors links that
      // way, and accepting it would make the rendered destination depend on
      // the page the link happens to sit on.
      expect(classifyLinkTarget('learn/basics', siteRelative)).toBe('unsafe');
    });
  });

  describe('length cap', () => {
    const longPath = (length: number) => `https://example.com/${'a'.repeat(length)}`;

    it('accepts an href at the cap', () => {
      const href = longPath(MAX_LINK_HREF_LENGTH - 'https://example.com/'.length);
      expect(href).toHaveLength(MAX_LINK_HREF_LENGTH);
      expect(classifyLinkTarget(href)).toBe('external');
    });

    it('rejects an href past the cap', () => {
      const href = longPath(MAX_LINK_HREF_LENGTH);
      expect(classifyLinkTarget(href)).toBe('unsafe');
    });

    it('rejects an over-long site-relative path too', () => {
      expect(classifyLinkTarget(`/${'a'.repeat(MAX_LINK_HREF_LENGTH)}`, siteRelative)).toBe(
        'unsafe'
      );
    });
  });

  describe('non-URLs', () => {
    it('rejects an empty or blank href', () => {
      expect(classifyLinkTarget('')).toBe('unsafe');
      expect(classifyLinkTarget('   ', siteRelative)).toBe('unsafe');
    });

    it('rejects free text', () => {
      expect(classifyLinkTarget('Internet', siteRelative)).toBe('unsafe');
      expect(classifyLinkTarget('not a url', siteRelative)).toBe('unsafe');
    });
  });
});
