import jaMessages from '@/messages/ja.json';
import { describe, expect, it } from 'vitest';

import { getRankGuide, paragraphToPlainText } from '@/lib/guides';
import type { FlatGuide } from '@/lib/guides';

import { getGuideInlineLink } from './paragraphInlineLinks';

/**
 * Inline links and visual aids are addressed by `(rank, page, paragraphIndex)`,
 * so they are pinned to the ORDER of `guides.pages.<rank>.pages[].paragraphs`
 * in the message JSON — a positional coupling nothing else enforces. Inserting
 * or removing a paragraph silently slides every anchor below it onto the wrong
 * prose; nothing throws, and the page still renders.
 *
 * These tests pin the anchors to the text they are meant to sit under, so the
 * drift fails here instead of shipping a card attached to the wrong sentence.
 * They assert against ja.json because it is the authored locale (the others are
 * placeholders until translation).
 */
function paragraphAt(rank: '1kyu', page: number, index: number): string {
  const guide = getRankGuide(jaMessages.guides.pages as Record<string, unknown>, rank);
  expect(guide?.format).toBe('flat');
  const paragraph = (guide as FlatGuide).pages[page - 1]?.paragraphs[index];
  expect(paragraph, `${rank} page ${page} has no paragraph at index ${index}`).toBeDefined();
  return paragraphToPlainText(paragraph!);
}

describe('1kyu guide anchor coordinates', () => {
  it('anchors the Kata link card under the paragraph that hands off to it', () => {
    // The card must follow "...so here is a feature for it", because the two
    // paragraphs after the card open with "上記で" and describe what it does.
    expect(paragraphAt('1kyu', 1, 6)).toContain('以下のような機能も用意しました');

    const info = getGuideInlineLink('1kyu', 1, 6, 'ja', () => 'label');
    expect(info?.href).toBe('/ja/repertoires');
  });

  it('places the objections list directly under its lead-in', () => {
    expect(paragraphAt('1kyu', 1, 4)).toContain('例えば以下のようなものです');
    expect(paragraphAt('1kyu', 1, 5)).toContain('チェスは記憶ではなくてアイデアが重要');
  });

  it('keeps the paragraph that follows the card referring back to it', () => {
    expect(paragraphAt('1kyu', 1, 7)).toContain('上記で');
  });
});
