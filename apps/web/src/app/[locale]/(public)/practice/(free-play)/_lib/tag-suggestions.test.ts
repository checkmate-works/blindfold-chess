import { describe, expect, it } from 'vitest';

import type { ChunkOption } from '@/lib/chunks/types';
import type { ThemeOption } from '@/lib/themes/types';

import { computeTagSuggestions } from './tag-suggestions';

const theme = (id: string, label: string): ThemeOption => ({ id, label }) as ThemeOption;
const chunk = (id: string, label: string): ChunkOption => ({ id, label }) as ChunkOption;

const themes = Array.from({ length: 12 }, (_, i) => theme(`t${i}`, `Theme ${i}`));
const chunks = Array.from({ length: 12 }, (_, i) => chunk(`c${i}`, `Chunk ${i}`));

describe('computeTagSuggestions', () => {
  it('caps each kind at 10 while idle and reports the hidden count', () => {
    const { displayItems, hiddenCount } = computeTagSuggestions({
      inputValue: '',
      availableThemes: themes,
      availableChunks: chunks,
      selectedThemeIds: new Set(),
      selectedChunkIds: new Set(),
    });
    expect(displayItems.filter((i) => i.kind === 'theme')).toHaveLength(10);
    expect(displayItems.filter((i) => i.kind === 'chunk')).toHaveLength(10);
    // 2 themes + 2 chunks over the cap.
    expect(hiddenCount).toBe(4);
  });

  it('leads with themes, then chunks', () => {
    const { displayItems } = computeTagSuggestions({
      inputValue: '',
      availableThemes: [theme('t', 'A')],
      availableChunks: [chunk('c', 'B')],
      selectedThemeIds: new Set(),
      selectedChunkIds: new Set(),
    });
    expect(displayItems.map((i) => i.kind)).toEqual(['theme', 'chunk']);
  });

  it('filters by case-insensitive label substring and shows the full set when typing', () => {
    const { displayItems, hiddenCount } = computeTagSuggestions({
      inputValue: 'theme 1',
      availableThemes: themes, // "Theme 1", "Theme 10", "Theme 11"
      availableChunks: chunks,
      selectedThemeIds: new Set(),
      selectedChunkIds: new Set(),
    });
    expect(displayItems.every((i) => i.kind === 'theme')).toBe(true);
    expect(displayItems).toHaveLength(3);
    // No idle cap once the user is typing.
    expect(hiddenCount).toBe(0);
  });

  it('excludes already-selected items', () => {
    const { displayItems } = computeTagSuggestions({
      inputValue: '',
      availableThemes: [theme('t0', 'A'), theme('t1', 'B')],
      availableChunks: [],
      selectedThemeIds: new Set(['t0']),
      selectedChunkIds: new Set(),
    });
    expect(displayItems.map((i) => i.id)).toEqual(['t1']);
  });
});
