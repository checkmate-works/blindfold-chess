'use client';

import { useCallback, useState } from 'react';

import type { ChunkOption } from '@/lib/chunks/types';
import type { ThemeOption } from '@/lib/themes/types';

export type PuzzleTagSelectionOptions = {
  initialThemes?: ThemeOption[];
  initialChunks?: ChunkOption[];
};

export function usePuzzleTagSelection({
  initialThemes,
  initialChunks,
}: PuzzleTagSelectionOptions = {}) {
  const [selectedThemes, setSelectedThemes] = useState<ThemeOption[]>(initialThemes ?? []);
  const [selectedChunks, setSelectedChunks] = useState<ChunkOption[]>(initialChunks ?? []);

  const handleTagChange = useCallback((themes: ThemeOption[], chunks: ChunkOption[]) => {
    setSelectedThemes(themes);
    setSelectedChunks(chunks);
  }, []);

  function reset() {
    setSelectedThemes(initialThemes ?? []);
    setSelectedChunks(initialChunks ?? []);
  }

  return {
    selectedThemes,
    setSelectedThemes,
    selectedChunks,
    setSelectedChunks,
    handleTagChange,
    reset,
  };
}

export type PuzzleTagSelection = ReturnType<typeof usePuzzleTagSelection>;
