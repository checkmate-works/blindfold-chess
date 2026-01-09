'use client';

import { useCallback, useEffect, useState } from 'react';

import { useTranslations } from 'next-intl';

import type { Locale } from '@/app/[locale]/_lib/types';
import { QuitConfirmModal } from '@/app/[locale]/practice/_components/QuitConfirmModal';

import {
  getAvailableKnightMoves,
  getRandomSquare,
  isClosedTourPossible,
  isTourComplete,
  isValidKnightMove,
} from '../_lib/utils';
import { KnightTourBlindPlaying } from './KnightTourBlindPlaying';
import { KnightTourPlaying } from './KnightTourPlaying';
import { KnightTourResult } from './KnightTourResult';
import { KnightTourSetup } from './KnightTourSetup';

type GameState = 'setup' | 'playing' | 'finished';

type Props = {
  locale: Locale;
};

const STORAGE_KEY = 'knightTour_settings';

export default function KnightTour({ locale }: Props) {
  const t = useTranslations('practice.knightTour');
  const tQuit = useTranslations('practice.quitConfirmModal');

  // Settings
  const [startingSquareOption, setStartingSquareOption] = useState(() => {
    if (typeof window === 'undefined') return 'random';
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const settings = JSON.parse(saved);
        return settings.startingSquare || 'random';
      } catch {
        // ignore parse errors
      }
    }
    return 'random';
  });

  const [blindfoldMode, setBlindfoldMode] = useState(() => {
    if (typeof window === 'undefined') return false;
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const settings = JSON.parse(saved);
        return settings.blindfoldMode || false;
      } catch {
        // ignore parse errors
      }
    }
    return false;
  });

  // Track if blindfold mode is active for current game
  const [isBlindfolded, setIsBlindfolded] = useState(false);

  // Game state
  const [gameState, setGameState] = useState<GameState>('setup');
  const [startingSquare, setStartingSquare] = useState('');
  const [currentSquare, setCurrentSquare] = useState('');
  const [visitedSquares, setVisitedSquares] = useState<Map<string, number>>(new Map());
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [showQuitModal, setShowQuitModal] = useState(false);

  // Save settings when they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ startingSquare: startingSquareOption, blindfoldMode })
      );
    }
  }, [startingSquareOption, blindfoldMode]);

  const startGame = useCallback(() => {
    const square = startingSquareOption === 'random' ? getRandomSquare() : startingSquareOption;
    setStartingSquare(square);
    setCurrentSquare(square);
    setVisitedSquares(new Map([[square, 1]]));
    setMoveHistory([square]);
    setIsBlindfolded(blindfoldMode);
    setGameState('playing');
  }, [startingSquareOption, blindfoldMode]);

  const handleSquareClick = useCallback(
    (targetSquare: string) => {
      if (!isValidKnightMove(currentSquare, targetSquare)) return;
      if (visitedSquares.has(targetSquare)) return;

      const newMoveNumber = visitedSquares.size + 1;
      const newVisitedSquares = new Map(visitedSquares);
      newVisitedSquares.set(targetSquare, newMoveNumber);

      setVisitedSquares(newVisitedSquares);
      setCurrentSquare(targetSquare);
      setMoveHistory((prev) => [...prev, targetSquare]);

      // Check if tour is complete
      if (isTourComplete(newVisitedSquares)) {
        setGameState('finished');
      }
    },
    [currentSquare, visitedSquares]
  );

  const handleUndo = useCallback(() => {
    if (moveHistory.length <= 1) return;

    const newHistory = [...moveHistory];
    newHistory.pop();
    const previousSquare = newHistory[newHistory.length - 1];

    const newVisitedSquares = new Map(visitedSquares);
    newVisitedSquares.delete(currentSquare);

    setMoveHistory(newHistory);
    setCurrentSquare(previousSquare);
    setVisitedSquares(newVisitedSquares);
  }, [moveHistory, currentSquare, visitedSquares]);

  const handleQuit = useCallback(() => {
    setShowQuitModal(true);
  }, []);

  const confirmQuit = useCallback(() => {
    setShowQuitModal(false);
    setGameState('finished');
  }, []);

  const cancelQuit = useCallback(() => {
    setShowQuitModal(false);
  }, []);

  const handlePlayAgain = useCallback(() => {
    setGameState('setup');
    setVisitedSquares(new Map());
    setMoveHistory([]);
    setCurrentSquare('');
    setStartingSquare('');
    setIsBlindfolded(false);
  }, []);

  // Compute available moves
  const availableMoves =
    gameState === 'playing' ? getAvailableKnightMoves(currentSquare, visitedSquares) : [];

  // Check if tour is complete and closed
  const isComplete = isTourComplete(visitedSquares);
  const isClosedTour = isClosedTourPossible(currentSquare, startingSquare, visitedSquares);

  if (gameState === 'finished') {
    return (
      <KnightTourResult
        success={isComplete}
        moveCount={visitedSquares.size}
        visitedSquares={visitedSquares}
        lastSquare={currentSquare}
        startingSquare={startingSquare}
        isClosedTour={isClosedTour}
        onPlayAgain={handlePlayAgain}
      />
    );
  }

  if (gameState === 'setup') {
    return (
      <KnightTourSetup
        startingSquare={startingSquareOption}
        onStartingSquareChange={setStartingSquareOption}
        blindfoldMode={blindfoldMode}
        onBlindfoldModeChange={setBlindfoldMode}
        onStart={startGame}
      />
    );
  }

  const PlayingComponent = isBlindfolded ? KnightTourBlindPlaying : KnightTourPlaying;

  return (
    <>
      <PlayingComponent
        currentSquare={currentSquare}
        visitedSquares={visitedSquares}
        availableMoves={availableMoves}
        moveCount={visitedSquares.size}
        onSquareClick={handleSquareClick}
        onUndo={handleUndo}
        onQuit={handleQuit}
        canUndo={moveHistory.length > 1}
      />
      <QuitConfirmModal
        isOpen={showQuitModal}
        onConfirm={confirmQuit}
        onCancel={cancelQuit}
        labels={{
          title: tQuit('title'),
          message: tQuit('message'),
          confirmButton: tQuit('confirmButton'),
          cancelButton: tQuit('cancelButton'),
        }}
      />
    </>
  );
}
