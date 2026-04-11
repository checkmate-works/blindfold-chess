import { useCallback, useState } from 'react';

type UseCoordinateInputOptions = {
  /**
   * Called synchronously with `${file}${rank}` once both coordinates are
   * selected. After the call, both selections are cleared so the next pair
   * can be entered.
   */
  onCoordinateComplete: (square: string) => void;
  /**
   * Called when `handleBackspace` falls through to the "undo last move"
   * case (both file and rank already cleared and `hasMovesToUndo()` is true).
   */
  onUndo: () => void;
  /**
   * Predicate read at Backspace time to decide whether the fallthrough
   * should trigger `onUndo`. Kept as a callback so the hook doesn't need
   * to know the caller's moves array.
   */
  hasMovesToUndo: () => boolean;
  /** When true, every press/backspace is a no-op. */
  disabled?: boolean;
};

/**
 * Coordinate input state + controller for the route-planner practice.
 *
 * Owns `selectedFile` / `selectedRank` and exposes press / backspace
 * handlers so keyboard input and on-screen buttons share one code path.
 *
 * Also exposes `hoveredPathIndex` / `lockedPathIndex` state used by the
 * result view after submission — these are intentionally decoupled from
 * the coordinate entry lifecycle and are reset together with the rest of
 * the input via `resetInput()`.
 *
 * Backspace semantics (staged):
 *   1. If `selectedRank` is set → clear rank (file preserved)
 *   2. Else if `selectedFile` is set → clear file
 *   3. Else if `hasMovesToUndo()` returns true → call `onUndo()`
 *   4. Else no-op
 */
export function useCoordinateInput({
  onCoordinateComplete,
  onUndo,
  hasMovesToUndo,
  disabled = false,
}: UseCoordinateInputOptions) {
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

  const handleFilePress = useCallback(
    (file: string) => {
      if (disabled) return;
      const newFile = file === selectedFile ? null : file;
      if (newFile && selectedRank) {
        setSelectedFile(null);
        setSelectedRank(null);
        onCoordinateComplete(`${newFile}${selectedRank}`);
        return;
      }
      setSelectedFile(newFile);
    },
    [disabled, selectedFile, selectedRank, onCoordinateComplete]
  );

  const handleRankPress = useCallback(
    (rank: string) => {
      if (disabled) return;
      const newRank = rank === selectedRank ? null : rank;
      if (selectedFile && newRank) {
        setSelectedFile(null);
        setSelectedRank(null);
        onCoordinateComplete(`${selectedFile}${newRank}`);
        return;
      }
      setSelectedRank(newRank);
    },
    [disabled, selectedFile, selectedRank, onCoordinateComplete]
  );

  const handleBackspace = useCallback(() => {
    if (disabled) return;
    if (selectedRank !== null) {
      setSelectedRank(null);
      return;
    }
    if (selectedFile !== null) {
      setSelectedFile(null);
      return;
    }
    if (hasMovesToUndo()) {
      onUndo();
    }
  }, [disabled, selectedFile, selectedRank, hasMovesToUndo, onUndo]);

  return {
    selectedFile,
    selectedRank,
    handleFilePress,
    handleRankPress,
    handleBackspace,
    hoveredPathIndex,
    lockedPathIndex,
    highlightedPathIndex,
    setHoveredPathIndex,
    setLockedPathIndex,
    resetInput,
  };
}
