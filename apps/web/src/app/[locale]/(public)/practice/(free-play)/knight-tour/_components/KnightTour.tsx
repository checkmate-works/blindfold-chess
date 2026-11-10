'use client';

import { useCallback, useEffect, useState } from 'react';

import { useRouter } from 'next/navigation';

import { useSafeLocale as useLocale } from '@/i18n/use-safe-locale';
import { type FieldGuard, isBoolean, isValidSquare } from '@blindfold-chess/features/common';
import {
  DEFAULT_KNIGHT_TOUR_SETTINGS,
  isTourComplete,
  summarizeKnightTour,
} from '@blindfold-chess/features/knight-tour';
import { useKnightTour } from '@blindfold-chess/features/knight-tour/client';

import { useLocalStorageSettings } from '@/lib/persistent-settings/use-local-storage-settings';

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

/**
 * What this screen persists between visits: the starting square the setup
 * offers (`'random'` or a square) and whether the tour is played blindfolded.
 *
 * Read through `useLocalStorageSettings`, like every other practice module,
 * rather than straight from storage in a `useState` initializer. The setup is
 * server-rendered, where storage does not exist, so an initializer renders
 * `'random'` / unchecked on the server and the stored choice in the hydrating
 * client. That only went unnoticed because the two differing values are a
 * controlled `<select>` and checkbox, which React quietly corrects during
 * hydration; the same read feeding text or an attribute would have kept the
 * server's markup. The hook renders the defaults on both sides, applies the
 * stored value after mount, and checks it with `GUARDS`. The key and the JSON
 * shape are the ones the initializer read, so a choice saved before the change
 * is picked up.
 */
const STORAGE_KEY = 'knightTour_settings';

const isStartingSquareOption: FieldGuard<string> = (value): value is string =>
  value === 'random' || (typeof value === 'string' && isValidSquare(value));

const GUARDS = { startingSquare: isStartingSquareOption, blindfoldMode: isBoolean };

export default function KnightTour({
  autoStart = false,
  initialStartingSquare,
  initialBlindfoldMode,
  isTutorial = false,
}: Props) {
  const locale = useLocale();
  const quitConfirmLabels = useQuitConfirmLabels();

  // Settings. Only the setup screen changes them, so the auto-started
  // session and tutorial (which take theirs from props) never write here.
  const { settings, updateSettings } = useLocalStorageSettings(
    STORAGE_KEY,
    DEFAULT_KNIGHT_TOUR_SETTINGS,
    GUARDS
  );
  const { startingSquare: startingSquareOption, blindfoldMode } = settings;

  // Track if blindfold mode is active for current game
  const [isBlindfolded, setIsBlindfolded] = useState(false);

  // Game state
  const [gameState, setGameState] = useState<GameState>('setup');
  const tour = useKnightTour();
  const { startingSquare, currentSquare, visitedSquares, moveHistory, start, move, undo } = tour;
  const [showQuitModal, setShowQuitModal] = useState(false);

  const router = useRouter();

  // Handle Finish/Result Redirection
  useEffect(() => {
    if (gameState === 'finished') {
      const summary = summarizeKnightTour({
        startingSquare,
        currentSquare,
        visitedSquares,
        moveHistory,
      });
      const results = {
        visitedSquares: Array.from(summary.visitedSquares.entries()),
        lastSquare: summary.lastSquare,
        success: summary.success,
        isClosedTour: summary.isClosedTour,
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
    moveHistory,
    isBlindfolded,
    isTutorial,
    locale,
    router,
  ]);

  useScrollToElement('knight-tour-session', gameState === 'playing');

  // Auto-start game when autoStart is true (for tutorial mode)
  useEffect(() => {
    if (autoStart && gameState === 'setup') {
      const square = initialStartingSquare || 'a1';
      const blindfolded = initialBlindfoldMode ?? false;
      start(square);
      setIsBlindfolded(blindfolded);
      setGameState('playing');
    }
  }, [autoStart, initialStartingSquare, initialBlindfoldMode, gameState, start]);

  const handleSquareClick = useCallback(
    (targetSquare: string) => {
      const next = move(targetSquare);
      if (next && isTourComplete(next.visitedSquares)) {
        setGameState('finished');
      }
    },
    [move]
  );

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

  const availableMoves = gameState === 'playing' ? tour.availableMoves : [];

  if (gameState === 'setup') {
    return (
      <KnightTourSetup
        startingSquare={startingSquareOption}
        onStartingSquareChange={(startingSquare) => updateSettings({ startingSquare })}
        blindfoldMode={blindfoldMode}
        onBlindfoldModeChange={(value) => updateSettings({ blindfoldMode: value })}
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
          onUndo={undo}
          onQuit={handleQuit}
          canUndo={tour.canUndo}
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
