'use client';

import { useMemo } from 'react';

import { useTranslations } from 'next-intl';

/**
 * Build the locale-resolved label bag for `<PuzzleTagPicker />` and
 * its detail modal. Memoized on the translator identity so callers
 * can pass the result by reference to memoized child components.
 */
export function useTagPickerLabels() {
  const t = useTranslations('practice.puzzle.tags');
  return useMemo(
    () => ({
      section: t('section'),
      help: t('help'),
      placeholder: t('placeholder'),
      badgeTheme: t('badge.theme'),
      badgeChunk: t('badge.chunk'),
      noResults: t('noResults'),
      remove: (label: string) => t('remove', { label }),
      openDetail: (label: string) => t('openDetail', { label }),
      moreItemsHint: (count: number) => t('moreItemsHint', { count }),
      detail: {
        readingPrefix: t('detail.readingPrefix'),
        noDescription: t('detail.noDescription'),
        viewInGlossary: t('detail.viewInGlossary'),
        viewChunkPage: t('detail.viewChunkPage'),
        detach: t('detail.detach'),
        close: t('detail.close'),
      },
    }),
    [t]
  );
}
