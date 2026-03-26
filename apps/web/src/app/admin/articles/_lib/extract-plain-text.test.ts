import { describe, expect, it } from 'vitest';

import { extractPlainText } from './extract-plain-text';
import type { TiptapJsonContent } from './types';

describe('extractPlainText', () => {
  it('should return empty string for null', () => {
    expect(extractPlainText(null)).toBe('');
  });

  it('should return empty string for undefined', () => {
    expect(extractPlainText(undefined)).toBe('');
  });

  it('should return empty string for empty document', () => {
    expect(extractPlainText({ type: 'doc', content: [] })).toBe('');
  });

  it('should extract text from a simple paragraph', () => {
    const doc: TiptapJsonContent = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Hello world' }],
        },
      ],
    };
    expect(extractPlainText(doc)).toBe('Hello world');
  });

  it('should join multiple paragraphs with newlines', () => {
    const doc: TiptapJsonContent = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'First paragraph' }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Second paragraph' }],
        },
      ],
    };
    expect(extractPlainText(doc)).toBe('First paragraph\nSecond paragraph');
  });

  it('should extract text from headings', () => {
    const doc: TiptapJsonContent = {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Title' }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Body text' }],
        },
      ],
    };
    expect(extractPlainText(doc)).toBe('Title\nBody text');
  });

  it('should concatenate inline text with marks', () => {
    const doc: TiptapJsonContent = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Hello ' },
            { type: 'text', text: 'bold', marks: [{ type: 'bold' }] },
            { type: 'text', text: ' world' },
          ],
        },
      ],
    };
    expect(extractPlainText(doc)).toBe('Hello bold world');
  });

  it('should handle nested list items', () => {
    const doc: TiptapJsonContent = {
      type: 'doc',
      content: [
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Item 1' }],
                },
              ],
            },
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Item 2' }],
                },
              ],
            },
          ],
        },
      ],
    };
    const result = extractPlainText(doc);
    expect(result).toContain('Item 1');
    expect(result).toContain('Item 2');
  });

  it('should return empty string for document with no content property', () => {
    const doc: TiptapJsonContent = { type: 'doc' };
    expect(extractPlainText(doc)).toBe('');
  });

  it('should handle text with multiple marks (bold + italic)', () => {
    const doc: TiptapJsonContent = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'styled',
              marks: [{ type: 'bold' }, { type: 'italic' }],
            },
          ],
        },
      ],
    };
    expect(extractPlainText(doc)).toBe('styled');
  });

  it('should handle text with link mark and attrs', () => {
    const doc: TiptapJsonContent = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Visit ' },
            {
              type: 'text',
              text: 'our site',
              marks: [{ type: 'link', attrs: { href: 'https://example.com' } }],
            },
            { type: 'text', text: ' for more.' },
          ],
        },
      ],
    };
    expect(extractPlainText(doc)).toBe('Visit our site for more.');
  });

  it('should skip image nodes (nodes without text)', () => {
    const doc: TiptapJsonContent = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Before image' }],
        },
        {
          type: 'image',
          attrs: { src: 'https://example.com/photo.png', alt: 'Photo' },
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'After image' }],
        },
      ],
    };
    const result = extractPlainText(doc);
    expect(result).toContain('Before image');
    expect(result).toContain('After image');
    expect(result).not.toContain('photo');
    expect(result).not.toContain('Photo');
  });

  it('should handle horizontal rule node (no text, no content)', () => {
    const doc: TiptapJsonContent = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Above' }],
        },
        { type: 'horizontalRule' },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Below' }],
        },
      ],
    };
    const result = extractPlainText(doc);
    expect(result).toContain('Above');
    expect(result).toContain('Below');
  });

  it('should handle blockquote with bold text inside', () => {
    const doc: TiptapJsonContent = {
      type: 'doc',
      content: [
        {
          type: 'blockquote',
          content: [
            {
              type: 'paragraph',
              content: [
                { type: 'text', text: 'A ' },
                { type: 'text', text: 'bold', marks: [{ type: 'bold' }] },
                { type: 'text', text: ' quote' },
              ],
            },
          ],
        },
      ],
    };
    expect(extractPlainText(doc)).toBe('A bold quote');
  });

  it('should handle nested list inside list item', () => {
    const doc: TiptapJsonContent = {
      type: 'doc',
      content: [
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Parent item' }],
                },
                {
                  type: 'bulletList',
                  content: [
                    {
                      type: 'listItem',
                      content: [
                        {
                          type: 'paragraph',
                          content: [{ type: 'text', text: 'Child item' }],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };
    const result = extractPlainText(doc);
    expect(result).toContain('Parent item');
    expect(result).toContain('Child item');
  });

  it('should handle deeply nested structure (5 levels)', () => {
    const doc: TiptapJsonContent = {
      type: 'doc',
      content: [
        {
          type: 'blockquote',
          content: [
            {
              type: 'blockquote',
              content: [
                {
                  type: 'blockquote',
                  content: [
                    {
                      type: 'blockquote',
                      content: [
                        {
                          type: 'paragraph',
                          content: [{ type: 'text', text: 'Deep text' }],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };
    expect(extractPlainText(doc)).toBe('Deep text');
  });

  it('should handle ordered list', () => {
    const doc: TiptapJsonContent = {
      type: 'doc',
      content: [
        {
          type: 'orderedList',
          attrs: { start: 1 },
          content: [
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'First' }],
                },
              ],
            },
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Second' }],
                },
              ],
            },
          ],
        },
      ],
    };
    const result = extractPlainText(doc);
    expect(result).toContain('First');
    expect(result).toContain('Second');
  });

  it('should handle code block', () => {
    const doc: TiptapJsonContent = {
      type: 'doc',
      content: [
        {
          type: 'codeBlock',
          attrs: { language: 'typescript' },
          content: [{ type: 'text', text: 'const x = 1;' }],
        },
      ],
    };
    expect(extractPlainText(doc)).toBe('const x = 1;');
  });

  it('should handle inline code mark', () => {
    const doc: TiptapJsonContent = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Use ' },
            { type: 'text', text: 'extractPlainText()', marks: [{ type: 'code' }] },
            { type: 'text', text: ' function' },
          ],
        },
      ],
    };
    expect(extractPlainText(doc)).toBe('Use extractPlainText() function');
  });

  it('should handle empty paragraph (no content in paragraph)', () => {
    const doc: TiptapJsonContent = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Before' }],
        },
        {
          type: 'paragraph',
          content: [],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'After' }],
        },
      ],
    };
    const result = extractPlainText(doc);
    expect(result).toContain('Before');
    expect(result).toContain('After');
  });

  it('should handle paragraph with no content property', () => {
    const doc: TiptapJsonContent = {
      type: 'doc',
      content: [
        { type: 'paragraph' },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Text' }],
        },
      ],
    };
    expect(extractPlainText(doc)).toContain('Text');
  });

  it('should handle mixed block types (heading, paragraph, list, blockquote)', () => {
    const doc: TiptapJsonContent = {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 1 },
          content: [{ type: 'text', text: 'Title' }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Intro text' }],
        },
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Item A' }],
                },
              ],
            },
          ],
        },
        {
          type: 'blockquote',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'A quote' }],
            },
          ],
        },
      ],
    };
    const result = extractPlainText(doc);
    expect(result).toContain('Title');
    expect(result).toContain('Intro text');
    expect(result).toContain('Item A');
    expect(result).toContain('A quote');
  });
});
