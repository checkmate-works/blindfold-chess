import { useCallback, useMemo } from "react";

import type { AlgebraicNotation } from "@blindfold-chess/types";
import { useNotationInput } from "@blindfold-chess/features/ai-game/notation-input/client";

type UseMoveInputProps = {
  fen: string;
  onSubmit: (move: AlgebraicNotation) => void;
};

/**
 * Mobile adapter over the shared `useNotationInput` hook.
 *
 * Exposes the structured field-by-field surface the mobile `ButtonInput`
 * renders, plus the one mobile-specific rule: when the UI is in pawn-capture
 * mode, tapping a file sets/toggles the target file instead of the selected
 * file.
 */
export function useMoveInput({ fen, onSubmit }: UseMoveInputProps) {
  const n = useNotationInput({ fen, onSubmit, resetOnSubmit: true });
  const { state } = n;

  const selectedFile = useMemo(() => {
    const files = Array.from(state.selectedFiles);
    return files.length > 0 ? files[0] : null;
  }, [state.selectedFiles]);

  const selectedRank = useMemo(() => {
    const ranks = Array.from(state.selectedRanks);
    return ranks.length > 0 ? ranks[0] : null;
  }, [state.selectedRanks]);

  // In pawn-capture mode, file taps set/toggle the target file instead of the
  // selected file. The shared hook exposes the raw actions; the mobile-specific
  // routing lives here rather than in the shared hook so the package stays
  // platform-agnostic.
  const handleFileSelect = useCallback(
    (file: string) => {
      if (n.isPawnCaptureMode) {
        n.setTargetFile(state.targetFile === file ? null : file);
      } else {
        n.selectFile(file);
      }
    },
    [n, state.targetFile],
  );

  const setIsAmbiguous = useCallback(
    (value: boolean | ((prev: boolean) => boolean)) => {
      const nextValue =
        typeof value === "function" ? value(state.isAmbiguous) : value;
      if (nextValue !== state.isAmbiguous) {
        n.toggleAmbiguous();
      }
    },
    [n, state.isAmbiguous],
  );

  return {
    // Structured state
    selectedPiece: state.selectedPiece,
    selectedFile,
    selectedRank,
    targetFile: state.targetFile,
    isCapture: state.isCapture,
    isCheck: state.isCheck,
    castling: state.castling,
    promotionPiece: state.promotionPiece,
    showPromotion: n.showPromotion,
    isPawnCaptureMode: n.isPawnCaptureMode,
    sourceFile: state.sourceFile,
    sourceRank: state.sourceRank,
    isAmbiguous: state.isAmbiguous,

    // Derived
    previewText: n.previewText,
    isSubmittable: n.isSubmittable,

    // Actions
    handlePieceSelect: n.selectPiece,
    handleFileSelect,
    handleRankSelect: n.selectRank,
    handleCaptureToggle: n.toggleCapture,
    handleCheckToggle: n.toggleCheck,
    handleCastlingSelect: n.selectCastling,
    handlePromotionSelect: n.selectPromotion,
    handleSourceFileSelect: n.selectSourceFile,
    handleSourceRankSelect: n.selectSourceRank,
    setIsAmbiguous,
    resetAll: n.reset,
    handleSubmit: n.submit,
  };
}
