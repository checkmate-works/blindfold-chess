import { useCallback, useRef, useState } from 'react';

export type StagedCoordinateState = {
  selectedFile: string | null;
  selectedRank: string | null;
};

type UseStagedCoordinateOptions = {
  /** When true, every press/clear is a no-op. */
  disabled?: boolean;
};

export type StagedCoordinate = StagedCoordinateState & {
  /**
   * Toggle-or-replace on the file side. Returns the next state that the hook
   * will hold after React flushes — callers can inspect this synchronously
   * to decide whether both slots are filled and dispatch accordingly.
   * Returns the current (unchanged) state when `disabled` is true.
   */
  pressFile: (file: string) => StagedCoordinateState;
  /** Symmetric to `pressFile` for the rank side. */
  pressRank: (rank: string) => StagedCoordinateState;
  /**
   * Clears whichever of {rank, file} is set, in that order. Returns true iff
   * something was cleared. No-op when `disabled` is true (returns false).
   */
  clearStage: () => boolean;
  /** True iff either `selectedFile` or `selectedRank` is non-null. */
  hasStage: () => boolean;
  /** Clears both to null unconditionally (ignores `disabled`). */
  resetStage: () => void;
};

/**
 * Pure staged-coordinate state controller for the route-planner practice.
 *
 * Owns `selectedFile` / `selectedRank` and exposes toggle-or-replace press
 * handlers plus a backspace-style `clearStage`. Has zero knowledge of
 * moves, undo, or games — callers observe the return value of `pressFile` /
 * `pressRank` to detect the "both set" condition and dispatch a move in the
 * same synchronous call stack.
 */
export function useStagedCoordinate(options: UseStagedCoordinateOptions = {}): StagedCoordinate {
  const { disabled = false } = options;
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [selectedRank, setSelectedRank] = useState<string | null>(null);

  // Mirror the latest state into a ref so callbacks can read synchronously
  // without re-creating themselves on every state change.
  const stateRef = useRef<StagedCoordinateState>({
    selectedFile: null,
    selectedRank: null,
  });
  stateRef.current = { selectedFile, selectedRank };

  const pressFile = useCallback(
    (file: string): StagedCoordinateState => {
      if (disabled) return stateRef.current;
      const { selectedFile: currentFile, selectedRank: currentRank } = stateRef.current;
      const nextFile = file === currentFile ? null : file;
      const next: StagedCoordinateState = {
        selectedFile: nextFile,
        selectedRank: currentRank,
      };
      stateRef.current = next;
      setSelectedFile(nextFile);
      return next;
    },
    [disabled]
  );

  const pressRank = useCallback(
    (rank: string): StagedCoordinateState => {
      if (disabled) return stateRef.current;
      const { selectedFile: currentFile, selectedRank: currentRank } = stateRef.current;
      const nextRank = rank === currentRank ? null : rank;
      const next: StagedCoordinateState = {
        selectedFile: currentFile,
        selectedRank: nextRank,
      };
      stateRef.current = next;
      setSelectedRank(nextRank);
      return next;
    },
    [disabled]
  );

  const clearStage = useCallback((): boolean => {
    if (disabled) return false;
    const { selectedFile: currentFile, selectedRank: currentRank } = stateRef.current;
    if (currentRank !== null) {
      stateRef.current = { selectedFile: currentFile, selectedRank: null };
      setSelectedRank(null);
      return true;
    }
    if (currentFile !== null) {
      stateRef.current = { selectedFile: null, selectedRank: null };
      setSelectedFile(null);
      return true;
    }
    return false;
  }, [disabled]);

  const hasStage = useCallback((): boolean => {
    const { selectedFile: f, selectedRank: r } = stateRef.current;
    return f !== null || r !== null;
  }, []);

  const resetStage = useCallback(() => {
    stateRef.current = { selectedFile: null, selectedRank: null };
    setSelectedFile(null);
    setSelectedRank(null);
  }, []);

  return {
    selectedFile,
    selectedRank,
    pressFile,
    pressRank,
    clearStage,
    hasStage,
    resetStage,
  };
}
