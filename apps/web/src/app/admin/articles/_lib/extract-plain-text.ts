import type { TiptapJsonContent, TiptapNode } from './types';

/**
 * Recursively extract plain text from a Tiptap JSON document.
 *
 * Walks through the `content` array and concatenates all `text` values.
 * Block-level nodes (paragraphs, headings, list items, etc.) are
 * separated by newlines.
 */
export function extractPlainText(doc: TiptapJsonContent | null | undefined): string {
  if (!doc) return '';

  const parts: string[] = [];
  collectText(doc, parts);
  return parts.join('\n').trim();
}

function collectText(node: TiptapNode, parts: string[]) {
  if (node.type === 'text' && typeof node.text === 'string') {
    // Append to the last part (inline text)
    if (parts.length === 0) {
      parts.push(node.text);
    } else {
      parts[parts.length - 1] += node.text;
    }
    return;
  }

  const content = node.content;
  if (!Array.isArray(content)) return;

  for (const child of content) {
    const isBlock = child.type !== 'text' && Array.isArray(child.content);

    if (isBlock && parts.length > 0 && parts[parts.length - 1] !== '') {
      parts.push('');
    }

    collectText(child, parts);
  }
}
