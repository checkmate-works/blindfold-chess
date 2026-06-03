import type { ChunkOption } from '@/lib/chunks/types';
import type { ThemeOption } from '@/lib/themes/types';

export type ThemeItem = ThemeOption & { kind: 'theme' };
export type ChunkItem = ChunkOption & { kind: 'chunk' };
export type TagItem = ThemeItem | ChunkItem;

/**
 * Idle dropdown caps. When the user has not typed anything we render at most
 * this many of each kind so the initial open is responsive even as the chunk
 * catalog grows (each row holds a 48px mini-board). The full filtered set is
 * shown the moment the user types.
 */
const IDLE_MAX_THEMES = 10;
const IDLE_MAX_CHUNKS = 10;

type Params = {
  inputValue: string;
  availableThemes: ThemeOption[];
  availableChunks: ChunkOption[];
  selectedThemeIds: ReadonlySet<string>;
  selectedChunkIds: ReadonlySet<string>;
};

/**
 * Build the TagPicker dropdown suggestions: case-insensitive label filtering
 * with already-selected items removed, themes (curated vocabulary) ahead of
 * chunks (UGC), and — while idle (no query) — each kind capped independently so
 * both groups stay visible. `hiddenCount` is how many matches the idle cap hid.
 *
 * Pure, so the filtering/capping can be reasoned about and tested without the
 * combobox.
 */
export function computeTagSuggestions({
  inputValue,
  availableThemes,
  availableChunks,
  selectedThemeIds,
  selectedChunkIds,
}: Params): { displayItems: TagItem[]; hiddenCount: number } {
  const q = inputValue.toLowerCase().trim();
  const isIdle = q.length === 0;
  const matches = (label: string) => !q || label.toLowerCase().includes(q);

  const matchedThemes: ThemeItem[] = availableThemes
    .filter((t) => !selectedThemeIds.has(t.id) && matches(t.label))
    .map((t) => ({ ...t, kind: 'theme' }));
  const matchedChunks: ChunkItem[] = availableChunks
    .filter((c) => !selectedChunkIds.has(c.id) && matches(c.label))
    .map((c) => ({ ...c, kind: 'chunk' }));

  const displayItems: TagItem[] = isIdle
    ? [...matchedThemes.slice(0, IDLE_MAX_THEMES), ...matchedChunks.slice(0, IDLE_MAX_CHUNKS)]
    : [...matchedThemes, ...matchedChunks];

  const hiddenCount = isIdle
    ? Math.max(0, matchedThemes.length - IDLE_MAX_THEMES) +
      Math.max(0, matchedChunks.length - IDLE_MAX_CHUNKS)
    : 0;

  return { displayItems, hiddenCount };
}
