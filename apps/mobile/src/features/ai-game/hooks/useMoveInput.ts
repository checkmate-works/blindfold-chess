import { useCallback, useEffect, useMemo, useState } from "react";
import type { AlgebraicNotation } from "@blindfold-chess/types";

type PromotionPiece = "q" | "r" | "b" | "n";

type UseMoveInputProps = {
  fen: string;
  onSubmit: (move: AlgebraicNotation) => void;
};

export function useMoveInput({ fen, onSubmit }: UseMoveInputProps) {
  const [selectedPiece, setSelectedPiece] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [selectedRank, setSelectedRank] = useState<string | null>(null);
  const [targetFile, setTargetFile] = useState<string | null>(null);
  const [isCapture, setIsCapture] = useState(false);
  const [isCheck, setIsCheck] = useState(false);
  const [castling, setCastling] = useState<"O-O" | "O-O-O" | null>(null);
  const [promotionPiece, setPromotionPiece] = useState<PromotionPiece | null>(
    null,
  );
  const [sourceFile, setSourceFile] = useState<string | null>(null);
  const [sourceRank, setSourceRank] = useState<string | null>(null);
  const [isAmbiguous, setIsAmbiguous] = useState(false);

  const isPawnCaptureMode =
    !selectedPiece && selectedFile !== null && isCapture;
  const showPromotion =
    !selectedPiece &&
    !castling &&
    selectedRank !== null &&
    (selectedRank === "1" || selectedRank === "8");

  // Reset target file if mode conditions are no longer met
  useEffect(() => {
    if (!isPawnCaptureMode) {
      setTargetFile(null);
    }
  }, [isPawnCaptureMode]);

  // Clear promotion if rank changes away from 1/8
  useEffect(() => {
    if (!showPromotion) {
      setPromotionPiece(null);
    }
  }, [showPromotion]);

  // Clear target file if capture is unchecked
  useEffect(() => {
    if (!isCapture) setTargetFile(null);
  }, [isCapture]);

  // Reset when FEN changes (new move was made)
  useEffect(() => {
    resetAll();
  }, [fen]);

  const resetAll = useCallback(() => {
    setSelectedPiece(null);
    setSelectedFile(null);
    setSelectedRank(null);
    setTargetFile(null);
    setIsCapture(false);
    setIsCheck(false);
    setCastling(null);
    setPromotionPiece(null);
    setSourceFile(null);
    setSourceRank(null);
    setIsAmbiguous(false);
  }, []);

  const handlePieceSelect = useCallback(
    (piece: string) => {
      const newPiece = selectedPiece === piece ? null : piece;
      setSelectedPiece(newPiece);
      if (castling) setCastling(null);
      if (!newPiece) {
        setSelectedFile(null);
      }
    },
    [selectedPiece, castling],
  );

  const handleFileSelect = useCallback(
    (file: string) => {
      if (isPawnCaptureMode) {
        // In pawn capture mode, second file is the target
        if (targetFile === file) {
          setTargetFile(null);
        } else {
          setTargetFile(file);
        }
      } else {
        setSelectedFile(selectedFile === file ? null : file);
      }
      if (castling) setCastling(null);
    },
    [selectedFile, castling, isPawnCaptureMode, targetFile],
  );

  const handleRankSelect = useCallback(
    (rank: string) => {
      setSelectedRank(selectedRank === rank ? null : rank);
      if (castling) setCastling(null);
    },
    [selectedRank, castling],
  );

  const handleCaptureToggle = useCallback(() => {
    setIsCapture((prev) => !prev);
  }, []);

  const handleCheckToggle = useCallback(() => {
    setIsCheck((prev) => !prev);
  }, []);

  const handleCastlingSelect = useCallback(
    (move: "O-O" | "O-O-O") => {
      if (castling === move) {
        setCastling(null);
      } else {
        setCastling(move);
        setSelectedPiece(null);
        setSelectedFile(null);
        setSelectedRank(null);
        setTargetFile(null);
        setPromotionPiece(null);
        setIsCapture(false);
      }
    },
    [castling],
  );

  const handlePromotionSelect = useCallback(
    (piece: PromotionPiece) => {
      setPromotionPiece(promotionPiece === piece ? null : piece);
    },
    [promotionPiece],
  );

  const handleSourceFileSelect = useCallback(
    (file: string) => {
      setSourceFile(sourceFile === file ? null : file);
    },
    [sourceFile],
  );

  const handleSourceRankSelect = useCallback(
    (rank: string) => {
      setSourceRank(sourceRank === rank ? null : rank);
    },
    [sourceRank],
  );

  const previewText = useMemo(() => {
    if (castling) return castling;

    let text = "";

    if (selectedPiece) {
      text += selectedPiece;
      if (sourceFile) text += sourceFile;
      if (sourceRank) text += sourceRank;
      if (isCapture) text += "x";
      if (selectedFile) text += selectedFile;
      if (selectedRank) text += selectedRank;
    } else {
      // Pawn move
      if (selectedFile) {
        text += selectedFile;
        if (isCapture && targetFile) {
          text += "x";
          text += targetFile;
        }
        if (selectedRank) text += selectedRank;
      }
      if (promotionPiece) {
        text += `=${promotionPiece.toUpperCase()}`;
      }
    }
    if (isCheck) text += "+";

    return text;
  }, [
    castling,
    selectedPiece,
    selectedFile,
    selectedRank,
    targetFile,
    isCapture,
    isCheck,
    sourceFile,
    sourceRank,
    promotionPiece,
  ]);

  const isSubmittable = previewText.length > 0;

  const handleSubmit = useCallback(() => {
    if (previewText) {
      onSubmit(previewText as AlgebraicNotation);
      resetAll();
    }
  }, [previewText, onSubmit, resetAll]);

  return {
    // State
    selectedPiece,
    selectedFile,
    selectedRank,
    targetFile,
    isCapture,
    isCheck,
    castling,
    promotionPiece,
    showPromotion,
    isPawnCaptureMode,
    sourceFile,
    sourceRank,
    isAmbiguous,

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
