import { cache } from 'react';

import {
  getAllAvailableChunkOptions,
  getLinkedChunkOptionsForPosition,
} from '@/lib/chunks/queries';
import type { ChunkOption } from '@/lib/chunks/types';
import { getAllAvailableThemes, getLinkedThemesForPosition } from '@/lib/themes/queries';
import type { ThemeOption } from '@/lib/themes/types';

import type { Locale } from '@/app/[locale]/_lib/types';

// Re-export option types so existing consumers in this feature
// directory keep their import paths stable.
export type { ChunkOption } from '@/lib/chunks/types';
export type { ThemeOption, ThemePosition } from '@/lib/themes/types';

export type PuzzleTagBundle = {
  themes: ThemeOption[];
  chunks: ChunkOption[];
};

/**
 * Bundle of themes + chunks attached to a puzzle. Each kind is loaded
 * by its dedicated query module under lib/<kind>/queries.ts; this
 * function is pure composition.
 */
export const loadPuzzleTags = cache(
  async (positionId: string, locale: Locale): Promise<PuzzleTagBundle> => {
    const [themes, chunks] = await Promise.all([
      getLinkedThemesForPosition(positionId, locale),
      getLinkedChunkOptionsForPosition(positionId),
    ]);
    return { themes, chunks };
  }
);

/**
 * Catalog of every theme-eligible glossary term and every non-deleted
 * chunk, for the picker.
 */
export const loadAvailableTags = cache(async (locale: Locale): Promise<PuzzleTagBundle> => {
  const [themes, chunks] = await Promise.all([
    getAllAvailableThemes(locale),
    getAllAvailableChunkOptions(),
  ]);
  return { themes, chunks };
});
