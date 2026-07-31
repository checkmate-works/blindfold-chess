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

function collectText(node: TiptapNode, acc: string[]) {
  if (node.type === 'text' && typeof node.text === 'string') {
    // Append to the last part (inline text). `acc` is a collector by
    // contract (allow-listed accumulator name for no-param-reassign).
    if (acc.length === 0) {
      acc.push(node.text);
    } else {
      acc[acc.length - 1] += node.text;
    }
    return;
  }

  const content = node.content;
  if (!Array.isArray(content)) return;

  for (const child of content) {
    const isBlock = child.type !== 'text' && Array.isArray(child.content);

    if (isBlock && acc.length > 0 && acc[acc.length - 1] !== '') {
      acc.push('');
    }

    collectText(child, acc);
  }
}
