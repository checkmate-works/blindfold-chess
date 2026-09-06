'use client';

import { useCallback, useMemo, useRef, useState } from 'react';

import type { ChunkOption } from '@/lib/chunks/types';
import type { ThemeOption } from '@/lib/themes/types';

export type TagSelectionOptions = {
  initialThemes?: ThemeOption[];
  initialChunks?: ChunkOption[];
};

/** True when `ids` is not the same set as `initialIds`, order ignored. */
function idsDiffer(ids: string[], initialIds: string[]): boolean {
  if (ids.length !== initialIds.length) return true;
  const initial = new Set(initialIds);
  return ids.some((id) => !initial.has(id));
}

export function useTagSelection({ initialThemes, initialChunks }: TagSelectionOptions = {}) {
  const [selectedThemes, setSelectedThemes] = useState<ThemeOption[]>(initialThemes ?? []);
  const [selectedChunks, setSelectedChunks] = useState<ChunkOption[]>(initialChunks ?? []);

  // The comparison baseline is the selection this hook was mounted with, not
  // whatever the props say later: an edit form that seeds itself from a
  // recovered draft replaces the selection through the setters, and that
  // still has to read as changed.
  const initialThemeIdsRef = useRef((initialThemes ?? []).map((t) => t.id));
  const initialChunkIdsRef = useRef((initialChunks ?? []).map((c) => c.id));

  const handleTagChange = useCallback((themes: ThemeOption[], chunks: ChunkOption[]) => {
    setSelectedThemes(themes);
    setSelectedChunks(chunks);
  }, []);

  function reset() {
    setSelectedThemes(initialThemes ?? []);
    setSelectedChunks(initialChunks ?? []);
  }

  const themeIds = useMemo(() => selectedThemes.map((t) => t.id), [selectedThemes]);
  const chunkIds = useMemo(() => selectedChunks.map((c) => c.id), [selectedChunks]);

  /**
   * Whether either selection differs from the one the hook mounted with.
   *
   * Both edit forms need it for their dirty check, and both had derived it
   * from refs of their own. Membership, not order: the picker appends, so a
   * tag removed and re-added must not read as a change.
   */
  const changed = useMemo(
    () =>
      idsDiffer(themeIds, initialThemeIdsRef.current) ||
      idsDiffer(chunkIds, initialChunkIdsRef.current),
    [themeIds, chunkIds]
  );

  return {
    selectedThemes,
    setSelectedThemes,
    selectedChunks,
    setSelectedChunks,
    handleTagChange,
    reset,
    themeIds,
    chunkIds,
    changed,
  };
}

export type TagSelection = ReturnType<typeof useTagSelection>;
