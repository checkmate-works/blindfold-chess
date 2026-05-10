import { cache } from 'react';

import {
  getAllAvailableChunkOptions,
  getLinkedChunkOptionsForPosition,
} from '@/lib/chunks/queries';
import type { ChunkOption } from '@/lib/chunks/types';
import { getAllAvailableThemes, getLinkedThemesForPosition } from '@/lib/themes/queries';
import type { ThemeOption } from '@/lib/themes/types';

import type { Locale } from '@/app/[locale]/_lib/types';

export type PositionTagBundle = {
  themes: ThemeOption[];
  chunks: ChunkOption[];
};

/**
 * Bundle of themes + chunks attached to a position. Pure composition
 * over the dedicated theme/chunk query modules under lib/<kind>/. Used
 * today by the puzzle editor; consumed by future position-memory and
 * other position-type editors that grow tagging support.
 */
export const loadPositionTags = cache(
  async (positionId: string, locale: Locale): Promise<PositionTagBundle> => {
    const [themes, chunks] = await Promise.all([
      getLinkedThemesForPosition(positionId, locale),
      getLinkedChunkOptionsForPosition(positionId),
    ]);
    return { themes, chunks };
  }
);

/**
 * Catalog of every theme-eligible glossary term and every non-deleted
 * chunk, for the picker UI.
 */
export const loadAvailableTags = cache(async (locale: Locale): Promise<PositionTagBundle> => {
  const [themes, chunks] = await Promise.all([
    getAllAvailableThemes(locale),
    getAllAvailableChunkOptions(),
  ]);
  return { themes, chunks };
});
