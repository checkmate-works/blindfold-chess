import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  type NotationInputState,
  type PromotionPiece,
  computeIsPawnCaptureMode,
  computePreviewText,
  computeShowPromotion,
  createInitialState,
  notationInputReducer,
} from '@blindfold-chess/features/ai-game/notation-input';
import type { AlgebraicNotation } from '@blindfold-chess/types';

type ButtonInputLogicProps = {
  fen: string;
  onSubmit: (move: AlgebraicNotation) => void;
};

function useReducerState() {
  const [state, setState] = useState<NotationInputState>(createInitialState);

  const dispatch = useCallback((...actions: Parameters<typeof notationInputReducer>[1][]) => {
    setState((prev) => actions.reduce((s, action) => notationInputReducer(s, action), prev));
  }, []);

  return [state, dispatch] as const;
}

export function useButtonInputLogic({ fen, onSubmit }: ButtonInputLogicProps) {
  const [state, dispatch] = useReducerState();
  const prevFenRef = useRef(fen);

  // Reset selections when FEN changes
  useEffect(() => {
    if (prevFenRef.current !== fen) {
      prevFenRef.current = fen;
      dispatch({ type: 'reset' });
    }
  }, [fen, dispatch]);

  const previewText = useMemo(() => computePreviewText(state), [state]);
  const showPromotion = useMemo(() => computeShowPromotion(state), [state]);
  const isPawnCaptureMode = useMemo(() => computeIsPawnCaptureMode(state), [state]);

  const handlePieceClick = useCallback(
    (piece: string) => dispatch({ type: 'selectPiece', piece }),
    [dispatch]
  );

  const handleFileClick = useCallback(
    (file: string) => dispatch({ type: 'selectFile', file }),
    [dispatch]
  );

  const handleCastlingClick = useCallback(
    (move: 'O-O' | 'O-O-O') => dispatch({ type: 'selectCastling', move }),
    [dispatch]
  );

  const toggleSelectionRanks = useCallback(
    (rank: string) => dispatch({ type: 'selectRank', rank }),
    [dispatch]
  );

  const setTargetFile = useCallback(
    (file: string | null) => {
      if (file !== null) {
        dispatch({ type: 'setTargetFile', file });
      }
    },
    [dispatch]
  );

  const setIsCapture = useCallback(
    (value: boolean | ((prev: boolean) => boolean)) => {
      if (typeof value === 'function') {
        // For callback style, we can't easily support this with the reducer,
        // but the existing usage always passes a boolean directly.
        dispatch({ type: 'toggleCapture' });
      } else if (value !== state.isCapture) {
        dispatch({ type: 'toggleCapture' });
      }
    },
    [dispatch, state.isCapture]
  );

  const setIsCheck = useCallback(
    (value: boolean | ((prev: boolean) => boolean)) => {
      if (typeof value === 'function') {
        dispatch({ type: 'toggleCheck' });
      } else if (value !== state.isCheck) {
        dispatch({ type: 'toggleCheck' });
      }
    },
    [dispatch, state.isCheck]
  );

  const setPromotionPiece = useCallback(
    (piece: PromotionPiece | null) => {
      if (piece !== null) {
        dispatch({ type: 'selectPromotion', piece });
      }
    },
    [dispatch]
  );

  const resetSelections = useCallback(() => dispatch({ type: 'reset' }), [dispatch]);

  const handleSubmit = useCallback(() => {
    const text = computePreviewText(state);
    if (text) {
      onSubmit(text as AlgebraicNotation);
      dispatch({ type: 'reset' });
    }
  }, [state, onSubmit, dispatch]);

  const setSourceFile = useCallback(
    (file: string | null) => {
      if (file !== null) {
        dispatch({ type: 'selectSourceFile', file });
      }
    },
    [dispatch]
  );

  const setSourceRank = useCallback(
    (rank: string | null) => {
      if (rank !== null) {
        dispatch({ type: 'selectSourceRank', rank });
      }
    },
    [dispatch]
  );

  const setIsAmbiguous = useCallback(
    (value: boolean | ((prev: boolean) => boolean)) => {
      if (typeof value === 'function') {
        dispatch({ type: 'toggleAmbiguous' });
      } else if (value !== state.isAmbiguous) {
        dispatch({ type: 'toggleAmbiguous' });
      }
    },
    [dispatch, state.isAmbiguous]
  );

  return {
    // States
    selectedPiece: state.selectedPiece,
    selectedFiles: state.selectedFiles,
    selectedRanks: state.selectedRanks,
    targetFile: state.targetFile,
    isCapture: state.isCapture,
    isCheck: state.isCheck,
    castling: state.castling,
    promotionPiece: state.promotionPiece,
    showPromotion,
    isPawnCaptureMode,

    // Derived
    previewText,

    // Actions
    handlePieceClick,
    handleFileClick,
    handleCastlingClick,
    toggleSelectionRanks,
    setTargetFile,
    setIsCapture,
    setIsCheck,
    setPromotionPiece,
    resetSelections,
    handleSubmit,
    // Disambiguation
    sourceFile: state.sourceFile,
    sourceRank: state.sourceRank,
    isAmbiguous: state.isAmbiguous,
    setSourceFile,
    setSourceRank,
    setIsAmbiguous,
  };
}
