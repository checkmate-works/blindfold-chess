'use client';

import { useCallback, useMemo, useState } from 'react';

import { getTurnFromFen, validateFen } from '@blindfold-chess/features/chess-core';

import { readSideToMove, replaceSideToMove } from '../_lib/fen-utils';
import { EMPTY_BOARD_FEN, type EditorTab, type SideToMove } from '../_lib/puzzle-form-constants';

export type FenBoardEditorOptions = {
  initialFen?: string;
  /**
   * Fires when the board content changes (FEN input, drag-drop, side-
   * to-move toggle, clear) — not on orientation flip or tab switch.
   */
  onBoardChange?: () => void;
};

export function useFenBoardEditor({ initialFen, onBoardChange }: FenBoardEditorOptions = {}) {
  const baseFenInput = initialFen ?? '';
  const baseBoardFen = initialFen ?? EMPTY_BOARD_FEN;
  const baseSide: SideToMove = initialFen ? readSideToMove(initialFen) : 'w';

  const [fenInput, setFenInput] = useState(baseFenInput);
  const [boardFen, setBoardFen] = useState(baseBoardFen);
  const [sideToMove, setSideToMove] = useState<SideToMove>(baseSide);
  const [positionError, setPositionError] = useState(false);
  const [activeTab, setActiveTab] = useState<EditorTab>('board');
  const [flipped, setFlipped] = useState(baseSide === 'b');
  const [userFlipped, setUserFlipped] = useState(false);

  const trimmedFen = fenInput.trim();
  const isFenValid = trimmedFen !== '' && validateFen(trimmedFen);
  const baseFen = isFenValid ? trimmedFen : '';

  const turnIndicator = useMemo(() => {
    if (!isFenValid) return null;
    try {
      return getTurnFromFen(trimmedFen);
    } catch {
      return null;
    }
  }, [trimmedFen, isFenValid]);

  const handleFlip = useCallback(() => {
    setFlipped((prev) => !prev);
    setUserFlipped(true);
  }, []);

  function handleFenInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const value = e.target.value;
    setFenInput(value);
    if (value.trim() !== '' && validateFen(value.trim())) {
      setBoardFen(value.trim());
      setSideToMove(readSideToMove(value.trim()));
    }
    onBoardChange?.();
  }

  function handleBoardChange(newFen: string) {
    const withSide = replaceSideToMove(newFen, sideToMove);
    setFenInput(withSide);
    setBoardFen(withSide);
    setPositionError(false);
    onBoardChange?.();
  }

  // Reset board state directly: EMPTY_BOARD_FEN fails validateFen's
  // king-count check, so the usual FEN-validation path would skip
  // setBoardFen. For this known-good reset we bypass validation.
  function handleClearBoard() {
    setFenInput(EMPTY_BOARD_FEN);
    setBoardFen(EMPTY_BOARD_FEN);
    setSideToMove('w');
    setPositionError(false);
    onBoardChange?.();
  }

  function handleSideToMoveChange(next: SideToMove) {
    if (next === sideToMove) return;
    setSideToMove(next);
    const sourceFen = boardFen && validateFen(boardFen) ? boardFen : EMPTY_BOARD_FEN;
    const updated = replaceSideToMove(sourceFen, next);
    setBoardFen(updated);
    setFenInput(updated);
    if (next === 'b' && !userFlipped) {
      setFlipped(true);
    }
    onBoardChange?.();
  }

  function resetBoard() {
    setFenInput(baseFenInput);
    setBoardFen(baseBoardFen);
    setSideToMove(baseSide);
    setPositionError(false);
    setActiveTab('board');
    setFlipped(baseSide === 'b');
    setUserFlipped(false);
  }

  return {
    // state
    fenInput,
    setFenInput,
    boardFen,
    setBoardFen,
    sideToMove,
    setSideToMove,
    positionError,
    setPositionError,
    activeTab,
    setActiveTab,
    flipped,
    setFlipped,
    userFlipped,
    setUserFlipped,
    // derived
    trimmedFen,
    isFenValid,
    baseFen,
    turnIndicator,
    // handlers
    handleFlip,
    handleFenInputChange,
    handleBoardChange,
    handleClearBoard,
    handleSideToMoveChange,
    resetBoard,
  };
}

export type FenBoardEditor = ReturnType<typeof useFenBoardEditor>;
