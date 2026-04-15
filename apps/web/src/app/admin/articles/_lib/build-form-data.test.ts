import { describe, expect, it } from 'vitest';

import { buildArticleFormData } from './build-form-data';
import type { TiptapJsonContent } from './types';

const baseInput = {
  slug: 'my-slug',
  title: 'My Title',
  locale: 'en',
  excerpt: 'An excerpt',
  description: 'A description',
  categoryId: 'cat-1',
  icon: ':book:',
};

describe('buildArticleFormData', () => {
  it('builds a markdown payload with raw content and null contentJson', () => {
    const result = buildArticleFormData({
      ...baseInput,
      contentFormat: 'markdown',
      markdownContent: '# Hello\n\nworld',
      contentJson: null,
    });

    expect(result).toEqual({
      ...baseInput,
      content: '# Hello\n\nworld',
      contentJson: null,
      contentFormat: 'markdown',
    });
  });

  it('ignores contentJson when contentFormat is markdown', () => {
    const contentJson: TiptapJsonContent = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'ignored' }] }],
    };
    const result = buildArticleFormData({
      ...baseInput,
      contentFormat: 'markdown',
      markdownContent: 'only this',
      contentJson,
    });

    expect(result.content).toBe('only this');
    expect(result.contentJson).toBeNull();
  });

  it('builds a tiptap_json payload with plain-text extraction and deep-cloned json', () => {
    const contentJson: TiptapJsonContent = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Hello world' }],
        },
      ],
    };

    const result = buildArticleFormData({
      ...baseInput,
      contentFormat: 'tiptap_json',
      markdownContent: 'should be ignored',
      contentJson,
    });

    expect(result.contentFormat).toBe('tiptap_json');
    expect(result.content).toContain('Hello world');
    expect(result.contentJson).toEqual(contentJson);
    // Ensure deep clone (different reference)
    expect(result.contentJson).not.toBe(contentJson);
  });

  it('handles null contentJson in tiptap_json mode', () => {
    const result = buildArticleFormData({
      ...baseInput,
      contentFormat: 'tiptap_json',
      markdownContent: '',
      contentJson: null,
    });

    expect(result.contentFormat).toBe('tiptap_json');
    expect(result.contentJson).toBeNull();
    expect(result.content).toBe('');
  });

  it('preserves all metadata fields in both modes', () => {
    const md = buildArticleFormData({
      ...baseInput,
      contentFormat: 'markdown',
      markdownContent: '',
      contentJson: null,
    });
    const tip = buildArticleFormData({
      ...baseInput,
      contentFormat: 'tiptap_json',
      markdownContent: '',
      contentJson: null,
    });
    for (const r of [md, tip]) {
      expect(r.slug).toBe(baseInput.slug);
      expect(r.title).toBe(baseInput.title);
      expect(r.locale).toBe(baseInput.locale);
      expect(r.excerpt).toBe(baseInput.excerpt);
      expect(r.description).toBe(baseInput.description);
      expect(r.categoryId).toBe(baseInput.categoryId);
      expect(r.icon).toBe(baseInput.icon);
    }
  });
});
