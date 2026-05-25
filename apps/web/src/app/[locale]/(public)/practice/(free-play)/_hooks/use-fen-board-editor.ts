'use client';

import { useCallback, useMemo, useState } from 'react';

import { getTurnFromFen, validateFen } from '@blindfold-chess/features/chess-core';

import { EMPTY_BOARD_FEN, type EditorTab, type SideToMove } from '../_lib/board-editor-constants';
import { readSideToMove, replaceSideToMove } from '../_lib/fen-utils';

export type FenBoardEditorOptions = {
  initialFen?: string;
  /**
   * Fires when the board content changes (FEN input, drag-drop, side-
   * to-move toggle, clear) — not on orientation flip or tab switch.
   */
  onBoardChange?: () => void;
  /**
   * Whether a FEN is acceptable for *this* editor's use case. Defaults to
   * `validateFen` (chess.js-backed legal-position check) which puzzle and
   * position-memory require. Catalog editors that legitimately accept
   * looser positions — e.g. chunks, which describe piece-coordination
   * patterns that may omit kings — pass `validateFenStructure` instead
   * so kingless or otherwise-illegal arrangements are not rejected.
   *
   * The default keeps every existing caller unchanged.
   */
  validate?: (fen: string) => boolean;
};

export function useFenBoardEditor({
  initialFen,
  onBoardChange,
  validate = validateFen,
}: FenBoardEditorOptions = {}) {
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
  const isFenValid = trimmedFen !== '' && validate(trimmedFen);
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
    if (value.trim() !== '' && validate(value.trim())) {
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

  // Reset board state directly: EMPTY_BOARD_FEN may fail the supplied
  // `validate` (e.g. validateFen's king-count check), so the usual
  // FEN-validation path would skip setBoardFen. For this known-good
  // reset we bypass validation.
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
    const sourceFen = boardFen && validate(boardFen) ? boardFen : EMPTY_BOARD_FEN;
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
