import { useCallback, useState } from 'react';

export function useCoordinateInput() {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [selectedRank, setSelectedRank] = useState<string | null>(null);
  const [hoveredPathIndex, setHoveredPathIndex] = useState<number | null>(null);
  const [lockedPathIndex, setLockedPathIndex] = useState<number | null>(null);

  const highlightedPathIndex = hoveredPathIndex ?? lockedPathIndex;

  const resetInput = useCallback(() => {
    setSelectedFile(null);
    setSelectedRank(null);
    setHoveredPathIndex(null);
    setLockedPathIndex(null);
  }, []);

  return {
    selectedFile,
    selectedRank,
    hoveredPathIndex,
    lockedPathIndex,
    highlightedPathIndex,
    setHoveredPathIndex,
    setLockedPathIndex,
    setSelectedFile,
    setSelectedRank,
    resetInput,
  };
}
