import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { AlgebraicNotation } from "@blindfold-chess/types";
import {
  type NotationInputState,
  type PromotionPiece,
  computeIsPawnCaptureMode,
  computeIsSubmittable,
  computePreviewText,
  computeShowPromotion,
  createInitialState,
  notationInputReducer,
} from "@blindfold-chess/features/ai-game/notation-input";

type UseMoveInputProps = {
  fen: string;
  onSubmit: (move: AlgebraicNotation) => void;
};

function useReducerState() {
  const [state, setState] = useState<NotationInputState>(createInitialState);

  const dispatch = useCallback(
    (...actions: Parameters<typeof notationInputReducer>[1][]) => {
      setState((prev) =>
        actions.reduce((s, action) => notationInputReducer(s, action), prev),
      );
    },
    [],
  );

  return [state, dispatch] as const;
}

export function useMoveInput({ fen, onSubmit }: UseMoveInputProps) {
  const [state, dispatch] = useReducerState();
  const prevFenRef = useRef(fen);

  // Reset when FEN changes (new move was made)
  useEffect(() => {
    if (prevFenRef.current !== fen) {
      prevFenRef.current = fen;
      dispatch({ type: "reset" });
    }
  }, [fen, dispatch]);

  const previewText = useMemo(() => computePreviewText(state), [state]);
  const showPromotion = useMemo(() => computeShowPromotion(state), [state]);
  const isPawnCaptureMode = useMemo(
    () => computeIsPawnCaptureMode(state),
    [state],
  );
  const isSubmittable = useMemo(() => computeIsSubmittable(state), [state]);

  // Expose singular selectedFile/selectedRank for backward compatibility
  const selectedFile = useMemo(() => {
    const files = Array.from(state.selectedFiles);
    return files.length > 0 ? files[0] : null;
  }, [state.selectedFiles]);

  const selectedRank = useMemo(() => {
    const ranks = Array.from(state.selectedRanks);
    return ranks.length > 0 ? ranks[0] : null;
  }, [state.selectedRanks]);

  const handlePieceSelect = useCallback(
    (piece: string) => dispatch({ type: "selectPiece", piece }),
    [dispatch],
  );

  // Mobile's handleFileSelect has special behavior: in pawn capture mode,
  // it sets/toggles the target file instead of the selected file.
  const handleFileSelect = useCallback(
    (file: string) => {
      if (computeIsPawnCaptureMode(state)) {
        if (state.targetFile === file) {
          dispatch({ type: "setTargetFile", file: null });
        } else {
          dispatch({ type: "setTargetFile", file });
        }
      } else {
        dispatch({ type: "selectFile", file });
      }
    },
    [dispatch, state],
  );

  const handleRankSelect = useCallback(
    (rank: string) => dispatch({ type: "selectRank", rank }),
    [dispatch],
  );

  const handleCaptureToggle = useCallback(
    () => dispatch({ type: "toggleCapture" }),
    [dispatch],
  );

  const handleCheckToggle = useCallback(
    () => dispatch({ type: "toggleCheck" }),
    [dispatch],
  );

  const handleCastlingSelect = useCallback(
    (move: "O-O" | "O-O-O") => dispatch({ type: "selectCastling", move }),
    [dispatch],
  );

  const handlePromotionSelect = useCallback(
    (piece: PromotionPiece) => dispatch({ type: "selectPromotion", piece }),
    [dispatch],
  );

  const handleSourceFileSelect = useCallback(
    (file: string) => dispatch({ type: "selectSourceFile", file }),
    [dispatch],
  );

  const handleSourceRankSelect = useCallback(
    (rank: string) => dispatch({ type: "selectSourceRank", rank }),
    [dispatch],
  );

  const setIsAmbiguous = useCallback(
    (value: boolean | ((prev: boolean) => boolean)) => {
      if (typeof value === "function") {
        dispatch({ type: "toggleAmbiguous" });
      } else if (value !== state.isAmbiguous) {
        dispatch({ type: "toggleAmbiguous" });
      }
    },
    [dispatch, state.isAmbiguous],
  );

  const resetAll = useCallback(() => dispatch({ type: "reset" }), [dispatch]);

  const handleSubmit = useCallback(() => {
    const text = computePreviewText(state);
    if (text) {
      onSubmit(text as AlgebraicNotation);
      dispatch({ type: "reset" });
    }
  }, [state, onSubmit, dispatch]);

  return {
    // State (backward compatible: singular selectedFile/selectedRank)
    selectedPiece: state.selectedPiece,
    selectedFile,
    selectedRank,
    targetFile: state.targetFile,
    isCapture: state.isCapture,
    isCheck: state.isCheck,
    castling: state.castling,
    promotionPiece: state.promotionPiece,
    showPromotion,
    isPawnCaptureMode,
    sourceFile: state.sourceFile,
    sourceRank: state.sourceRank,
    isAmbiguous: state.isAmbiguous,

    // Derived
    previewText,
    isSubmittable,

    // Actions
    handlePieceSelect,
    handleFileSelect,
    handleRankSelect,
    handleCaptureToggle,
    handleCheckToggle,
    handleCastlingSelect,
    handlePromotionSelect,
    handleSourceFileSelect,
    handleSourceRankSelect,
    setIsAmbiguous,
    resetAll,
    handleSubmit,
  };
}
