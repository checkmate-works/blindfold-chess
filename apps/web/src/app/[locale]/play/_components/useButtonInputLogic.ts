import { useEffect, useMemo, useState } from 'react';

import type { AlgebraicNotation } from '@blindfold-chess/core';

type PromotionPiece = 'q' | 'r' | 'b' | 'n';

type ButtonInputLogicProps = {
  fen: string;
  onSubmit: (move: AlgebraicNotation) => void;
};

export function useButtonInputLogic({ fen, onSubmit }: ButtonInputLogicProps) {
  // Selection States
  const [selectedPiece, setSelectedPiece] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [selectedRanks, setSelectedRanks] = useState<Set<string>>(new Set());

  // Target File (for Pawn Captures e.g. dxc5)
  const [targetFile, setTargetFile] = useState<string | null>(null);

  const [isCapture, setIsCapture] = useState(false);
  const [isCheck, setIsCheck] = useState(false);

  const [castling, setCastling] = useState<'O-O' | 'O-O-O' | null>(null);

  // Promotion State
  const [promotionPiece, setPromotionPiece] = useState<PromotionPiece | null>(null);
  const [showPromotion, setShowPromotion] = useState(false);

  // Disambiguation State (for Pieces)
  const [sourceFile, setSourceFile] = useState<string | null>(null);
  const [sourceRank, setSourceRank] = useState<string | null>(null);
  const [isAmbiguous, setIsAmbiguous] = useState(false);

  // Derived State: Pawn Capture Mode
  const isPawnCaptureMode = !selectedPiece && selectedFiles.size === 1 && isCapture;

  // Reset target file if mode conditions are no longer met
  useEffect(() => {
    if (!isPawnCaptureMode) {
      setTargetFile(null);
    }
  }, [isPawnCaptureMode]);

  const handlePieceClick = (piece: string) => {
    const newPiece = selectedPiece === piece ? null : piece;
    setSelectedPiece(newPiece);
    if (castling) setCastling(null);

    // If switching to Pawn mode (newPiece is null), clear file selections
    // so user starts fresh with single selection logic.
    if (!newPiece) {
      setSelectedFiles(new Set());
    }
  };

  // Reset selections when FEN changes
  useEffect(() => {
    resetSelections();
  }, [fen]);

  const resetSelections = () => {
    setSelectedPiece(null);
    setSelectedFiles(new Set());
    setTargetFile(null);
    setSelectedRanks(new Set());
    setIsCapture(false);
    setIsCheck(false);
    setCastling(null);
    setPromotionPiece(null);
    setShowPromotion(false);
    // Reset disambiguation
    setSourceFile(null);
    setSourceRank(null);
    setIsAmbiguous(false);
  };

  // Toggle helpers
  const toggleSelection = (
    set: Set<string>,
    setValue: React.Dispatch<React.SetStateAction<Set<string>>>,
    item: string
  ) => {
    const newSet = new Set(set);
    if (newSet.has(item)) {
      // If clicking the same item, toggle it off (clear selection)
      setValue(new Set());
    } else {
      // If clicking a new item, replace the selection (Single Select)
      setValue(new Set([item]));
    }

    // Reset castling when selecting other parts
    if (castling) setCastling(null);
  };

  const handleFileClick = (file: string) => {
    toggleSelection(selectedFiles, setSelectedFiles, file);
  };

  const handleCastlingClick = (move: 'O-O' | 'O-O-O') => {
    if (castling === move) {
      setCastling(null);
    } else {
      setCastling(move);
      setSelectedPiece(null);
      setSelectedFiles(new Set());
      setTargetFile(null);
      setSelectedRanks(new Set());
      setPromotionPiece(null);
      setShowPromotion(false);
      setIsCapture(false);
    }
  };

  // Preview Text Logic
  const previewText = useMemo(() => {
    if (castling) return castling;

    let text = '';

    if (selectedPiece) {
      // Piece Move: Piece + [SourceFile/Rank] + (x) + TargetFile + TargetRank
      text += selectedPiece;

      // Disambiguation
      if (sourceFile) text += sourceFile;
      if (sourceRank) text += sourceRank;

      if (isCapture) text += 'x';

      text += Array.from(selectedFiles).sort().join('');
      text += Array.from(selectedRanks).sort().join('');
    } else {
      // Pawn Move
      const file = Array.from(selectedFiles)[0];
      if (file) {
        text += file;
        if (isCapture && targetFile) {
          text += 'x';
          text += targetFile;
        }
        const rank = Array.from(selectedRanks)[0];
        if (rank) text += rank;
      }
      // Promotion
      if (promotionPiece) {
        text += `=${promotionPiece.toUpperCase()}`;
      }
    }
    if (isCheck) text += '+';

    return text;
  }, [
    castling,
    selectedPiece,
    selectedFiles,
    targetFile,
    selectedRanks,
    isCapture,
    isCheck,
    sourceFile,
    sourceRank,
    promotionPiece,
  ]);

  useEffect(() => {
    // Trigger promotion UI if in Pawn mode and Rank 1 or 8 is selected
    if (!selectedPiece && !castling && selectedRanks.size > 0) {
      const rank = Array.from(selectedRanks)[0];
      if (rank === '1' || rank === '8') {
        setShowPromotion(true);
        return;
      }
    }

    setShowPromotion(false);
    setPromotionPiece(null);
  }, [selectedPiece, castling, selectedRanks]);

  // Clear target file if capture is unchecked
  useEffect(() => {
    if (!isCapture) setTargetFile(null);
  }, [isCapture]);

  const handleSubmit = () => {
    if (previewText) {
      onSubmit(previewText as AlgebraicNotation);
      resetSelections();
    }
  };

  return {
    // States
    selectedPiece,
    selectedFiles,
    selectedRanks,
    targetFile,
    isCapture,
    isCheck,
    castling,
    promotionPiece,
    showPromotion,
    isPawnCaptureMode,

    // Derived
    previewText,

    // Actions
    handlePieceClick,
    handleFileClick,
    handleCastlingClick,
    toggleSelectionRanks: (rank: string) => toggleSelection(selectedRanks, setSelectedRanks, rank),
    setTargetFile,
    setIsCapture,
    setIsCheck,
    setPromotionPiece,
    resetSelections,
    handleSubmit,
    // Disambiguation
    sourceFile,
    sourceRank,
    isAmbiguous,
    setSourceFile,
    setSourceRank,
    setIsAmbiguous,
  };
}
