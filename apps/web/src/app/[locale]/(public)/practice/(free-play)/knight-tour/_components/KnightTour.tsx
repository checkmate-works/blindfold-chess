'use client';

import { useCallback, useEffect, useState } from 'react';

import { useRouter } from 'next/navigation';

import { useSafeLocale as useLocale } from '@/i18n/use-safe-locale';
import {
  getAvailableKnightMoves,
  isClosedTourPossible,
  isTourComplete,
  isValidKnightMove,
} from '@blindfold-chess/features/knight-tour';

import { readJson, writeJson } from '@/lib/persistent-settings/local-storage-adapter';

import { QuitConfirmModal } from '@/app/[locale]/(public)/practice/_components/QuitConfirmModal';
import { useQuitConfirmLabels } from '@/app/[locale]/(public)/practice/_hooks/use-quit-confirm-labels';
import { useScrollToElement } from '@/app/[locale]/(public)/practice/_hooks/use-scroll-to-element';

import { KnightTourBlindPlaying } from './KnightTourBlindPlaying';
import { KnightTourPlaying } from './KnightTourPlaying';
// import { KnightTourResult } from './KnightTourResult'; // Logic moved to page
import { KnightTourSetup } from './KnightTourSetup';

type GameState = 'setup' | 'playing' | 'finished';

type Props = {
  autoStart?: boolean;
  initialStartingSquare?: string;
  initialBlindfoldMode?: boolean;
  isTutorial?: boolean;
};

/** What this screen persists between visits. */
type StoredSetup = { startingSquare?: string; blindfoldMode?: boolean };

const STORAGE_KEY = 'knightTour_settings';

export default function KnightTour({
  autoStart = false,
  initialStartingSquare,
  initialBlindfoldMode,
  isTutorial = false,
}: Props) {
  const locale = useLocale();
  const quitConfirmLabels = useQuitConfirmLabels();

  // Settings
  const [startingSquareOption, setStartingSquareOption] = useState(
    () => readJson<StoredSetup>(STORAGE_KEY, {}).startingSquare || 'random'
  );

  const [blindfoldMode, setBlindfoldMode] = useState(
    () => readJson<StoredSetup>(STORAGE_KEY, {}).blindfoldMode || false
  );

  // Track if blindfold mode is active for current game
  const [isBlindfolded, setIsBlindfolded] = useState(false);

  // Game state
  const [gameState, setGameState] = useState<GameState>('setup');
  const [startingSquare, setStartingSquare] = useState('');
  const [currentSquare, setCurrentSquare] = useState('');
  const [visitedSquares, setVisitedSquares] = useState<Map<string, number>>(new Map());
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [showQuitModal, setShowQuitModal] = useState(false);

  const router = useRouter();

  // Handle Finish/Result Redirection
  useEffect(() => {
    if (gameState === 'finished') {
      const results = {
        visitedSquares: Array.from(visitedSquares.entries()),
        lastSquare: currentSquare,
        success: isTourComplete(visitedSquares), // Recalculate or use state if available
        isClosedTour: isClosedTourPossible(currentSquare, startingSquare, visitedSquares),
      };

      const settings = {
        startingSquare,
        blindfoldMode: isBlindfolded,
      };

      const params = new URLSearchParams();
      params.set('data', JSON.stringify(results));
      params.set('settings', JSON.stringify(settings));
      if (isTutorial) {
        params.set('mode', 'tutorial');
      }

      router.push(`/${locale}/practice/knight-tour/result?${params.toString()}`);
    }
  }, [
    gameState,
    visitedSquares,
    currentSquare,
    startingSquare,
    isBlindfolded,
    isTutorial,
    locale,
    router,
  ]);

  useScrollToElement('knight-tour-session', gameState === 'playing');

  // Save settings when they change (only if not autoStart mode)
  useEffect(() => {
    if (!autoStart) {
      writeJson(STORAGE_KEY, { startingSquare: startingSquareOption, blindfoldMode });
    }
  }, [startingSquareOption, blindfoldMode, autoStart]);

  // Auto-start game when autoStart is true (for tutorial mode)
  useEffect(() => {
    if (autoStart && gameState === 'setup') {
      const square = initialStartingSquare || 'a1';
      const blindfolded = initialBlindfoldMode ?? false;
      setStartingSquare(square);
      setCurrentSquare(square);
      setVisitedSquares(new Map([[square, 1]]));
      setMoveHistory([square]);
      setIsBlindfolded(blindfolded);
      setGameState('playing');
    }
  }, [autoStart, initialStartingSquare, initialBlindfoldMode, gameState]);

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

  // Compute available moves
  const availableMoves =
    gameState === 'playing' ? getAvailableKnightMoves(currentSquare, visitedSquares) : [];

  if (gameState === 'setup') {
    return (
      <KnightTourSetup
        startingSquare={startingSquareOption}
        onStartingSquareChange={setStartingSquareOption}
        blindfoldMode={blindfoldMode}
        onBlindfoldModeChange={setBlindfoldMode}
      />
    );
  }

  const PlayingComponent = isBlindfolded ? KnightTourBlindPlaying : KnightTourPlaying;

  return (
    <>
      <div id="knight-tour-session" className="min-h-screen">
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
      </div>
      <QuitConfirmModal
        isOpen={showQuitModal}
        onConfirm={confirmQuit}
        onCancel={cancelQuit}
        labels={quitConfirmLabels}
      />
    </>
  );
}
