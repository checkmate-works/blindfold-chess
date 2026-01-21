'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';

import { Button } from '@/app/_components';
import type { AlgebraicNotation, Side } from '@blindfold-chess/core';
import { Chess } from 'chess.js';
import { FaEye } from 'react-icons/fa';

import type { SkillLevel } from '@/lib/types';

import { PgnInput, SectionTitle } from '@/app/[locale]/_components';
import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import type { Locale } from '@/app/[locale]/_lib/types';
import { BoardViewModal } from '@/app/[locale]/play/_components/BoardViewModal';
import { parsePgn, validatePgn } from '@/app/[locale]/play/_lib/pgn-parser';

import { ColorSelector } from './ColorSelector';
import { SkillLevelSelector } from './SkillLevelSelector';
import { StartMethodSelector } from './StartMethodSelector';

type StartMethod = 'new' | 'pgn';

type Props = {
  locale: Locale;
};

export function NewGameForm({ locale }: Props) {
  const t = useTranslations('newGame');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { preferences } = useGamePreferences();
  const [startMethod, setStartMethod] = useState<StartMethod>('new');
  const [color, setColor] = useState<Side>('white');
  const [skillLevel, setSkillLevel] = useState<SkillLevel>(5);
  const [pgn, setPgn] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [colorLockedFromUrl, setColorLockedFromUrl] = useState(false);
  const [isBoardVisible, setIsBoardVisible] = useState(false);
  const [currentPosition, setCurrentPosition] = useState(-1); // -1 means latest position

  // Parse PGN to get moves array
  const pgnMoves = useMemo((): AlgebraicNotation[] => {
    if (!pgn.trim() || !validatePgn(pgn)) return [];
    try {
      return parsePgn(pgn) as AlgebraicNotation[];
    } catch {
      return [];
    }
  }, [pgn]);

  // Calculate FEN for a given position
  const getFenAtPosition = useCallback(
    (position: number): string => {
      const chess = new Chess();
      const movesToApply = position === -1 ? pgnMoves : pgnMoves.slice(0, position + 1);
      for (const move of movesToApply) {
        chess.move(move);
      }
      return chess.fen();
    },
    [pgnMoves]
  );

  // Current display FEN
  const displayFen = useMemo(() => {
    if (pgnMoves.length === 0) return new Chess().fen();
    return getFenAtPosition(currentPosition);
  }, [pgnMoves, currentPosition, getFenAtPosition]);

  // Format moves for display
  const formattedPgn = useMemo(() => {
    const formatted: { moveNumber: number; whiteMove: string; blackMove?: string }[] = [];
    for (let i = 0; i < pgnMoves.length; i += 2) {
      formatted.push({
        moveNumber: Math.floor(i / 2) + 1,
        whiteMove: pgnMoves[i],
        blackMove: pgnMoves[i + 1],
      });
    }
    return formatted;
  }, [pgnMoves]);

  // Calculate last move for highlighting
  const lastMove = useMemo(() => {
    if (pgnMoves.length === 0) return null;
    const position = currentPosition === -1 ? pgnMoves.length - 1 : currentPosition;
    if (position < 0) return null;

    try {
      const chess = new Chess();
      let lastMoveDetails: { from: string; to: string } | null = null;
      for (let i = 0; i <= position; i++) {
        const move = chess.move(pgnMoves[i]);
        if (i === position && move) {
          lastMoveDetails = { from: move.from, to: move.to };
        }
      }
      return lastMoveDetails;
    } catch {
      return null;
    }
  }, [pgnMoves, currentPosition]);

  // Navigation functions
  const navigateToPosition = useCallback(
    (position: number) => {
      if (position === -1 || position >= pgnMoves.length) {
        setCurrentPosition(-1);
      } else {
        setCurrentPosition(position);
      }
    },
    [pgnMoves.length]
  );

  const navigateToStart = useCallback(() => {
    setCurrentPosition(-2); // Special value to indicate start position
  }, []);

  const navigateToEnd = useCallback(() => {
    setCurrentPosition(-1);
  }, []);

  const navigatePrevious = useCallback(() => {
    if (currentPosition === -2) return;
    if (currentPosition === -1) {
      if (pgnMoves.length > 0) {
        navigateToPosition(pgnMoves.length - 2);
      }
    } else if (currentPosition === 0) {
      navigateToStart();
    } else {
      navigateToPosition(currentPosition - 1);
    }
  }, [currentPosition, pgnMoves.length, navigateToPosition, navigateToStart]);

  const navigateNext = useCallback(() => {
    if (currentPosition === -2) {
      if (pgnMoves.length > 0) {
        navigateToPosition(0);
      }
    } else if (currentPosition === -1) {
      return;
    } else {
      const newPosition = currentPosition + 1;
      if (newPosition < pgnMoves.length) {
        navigateToPosition(newPosition);
      }
    }
  }, [currentPosition, pgnMoves.length, navigateToPosition]);

  // Initialize from URL parameters
  useEffect(() => {
    const urlMoves = searchParams.get('moves');
    const urlColor = searchParams.get('color') as Side | null;
    const urlSkillLevel = searchParams.get('skillLevel');

    if (urlMoves) {
      try {
        const movesArray = JSON.parse(urlMoves) as AlgebraicNotation[];
        if (movesArray.length > 0) {
          // Convert moves array to PGN format (moves only, without headers)
          const pgnParts: string[] = [];
          for (let i = 0; i < movesArray.length; i += 2) {
            const moveNumber = Math.floor(i / 2) + 1;
            const whiteMove = movesArray[i];
            const blackMove = movesArray[i + 1];
            if (blackMove) {
              pgnParts.push(`${moveNumber}. ${whiteMove} ${blackMove}`);
            } else {
              pgnParts.push(`${moveNumber}. ${whiteMove}`);
            }
          }
          const pgnText = pgnParts.join(' ');
          setPgn(pgnText);
          setStartMethod('pgn');
        }
      } catch (error) {
        console.error('Failed to parse moves from URL:', error);
      }
    }

    if (urlColor) {
      setColor(urlColor);
      setColorLockedFromUrl(true); // Lock color from URL to prevent auto-derivation
    }

    if (urlSkillLevel) {
      const level = parseInt(urlSkillLevel);
      if (level >= 1 && level <= 20) {
        setSkillLevel(level as SkillLevel);
      }
    }
  }, [searchParams]);

  // Auto-derive color from PGN when PGN method is selected
  // Skip auto-derivation if color was set from URL
  useEffect(() => {
    if (colorLockedFromUrl) return; // Don't auto-derive if color came from URL

    if (startMethod === 'pgn' && pgn.trim() && validatePgn(pgn)) {
      try {
        const chess = new Chess();
        chess.loadPgn(pgn);
        const history = chess.history({ verbose: true });

        if (history.length > 0) {
          // Determine which color made the last move
          const lastMove = history[history.length - 1];
          // If last move was by white, user should play as black (next to move)
          // If last move was by black, user should play as white (next to move)
          const derivedColor: Side = lastMove.color === 'w' ? 'black' : 'white';
          setColor(derivedColor);
        }
      } catch {
        // If PGN parsing fails, keep current color selection
      }
    }
  }, [startMethod, pgn, colorLockedFromUrl]);

  const handlePgnChange = (value: string) => {
    setPgn(value);
  };

  const handleStartGame = async () => {
    setIsLoading(true);

    try {
      let moves: string[] | undefined;
      if (startMethod === 'pgn') {
        if (!pgn.trim() || !validatePgn(pgn)) {
          setIsLoading(false);
          return;
        }

        moves = parsePgn(pgn);
      }

      const finalColor: Side = color;

      // Navigate to game play screen with settings
      const searchParams = new URLSearchParams({
        color: finalColor,
        skillLevel: skillLevel.toString(),
      });

      // Add moves if from PGN
      if (moves && moves.length > 0) {
        searchParams.set('moves', JSON.stringify(moves));
      }

      router.push(`/${locale}/play?${searchParams.toString()}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Start Method Selector */}
      <SectionTitle>{t('startMethod')}</SectionTitle>
      <StartMethodSelector value={startMethod} onChange={setStartMethod} />

      {/* PGN Input (only show if pgn method selected) */}
      {startMethod === 'pgn' && (
        <>
          <SectionTitle>{t('pgnTitle')}</SectionTitle>
          <PgnInput value={pgn} onChange={handlePgnChange} />
          {/* Preview Button - show when PGN is valid */}
          {pgnMoves.length > 0 && (
            <div className="flex justify-center">
              <Button
                variant="outline"
                shadow={false}
                icon={<FaEye className="w-4 h-4" />}
                onClick={() => setIsBoardVisible(true)}
              >
                {t('previewBoard')}
              </Button>
            </div>
          )}
        </>
      )}

      {/* Color Selection (disabled when using PGN with valid moves, unless color was set from URL) */}
      <SectionTitle>{t('selectColor')}</SectionTitle>
      <ColorSelector
        value={color}
        onChange={(newColor) => {
          setColor(newColor);
          setColorLockedFromUrl(false); // Unlock when user manually changes color
        }}
        disabled={!colorLockedFromUrl && startMethod === 'pgn' && !!pgn.trim() && validatePgn(pgn)}
      />
      {startMethod === 'pgn' && pgn.trim() && validatePgn(pgn) && !colorLockedFromUrl && (
        <p className="text-sm text-muted-foreground">{t('derivedFromPgn')}</p>
      )}

      {/* Skill Level Selection */}
      <SkillLevelSelector value={skillLevel} onChange={setSkillLevel} />

      <Button
        onClick={handleStartGame}
        disabled={startMethod === 'pgn' && (!pgn.trim() || !validatePgn(pgn))}
        loading={isLoading}
        variant="primary"
        size="lg"
        className="w-full"
      >
        {t('startGame')}
      </Button>

      {/* Board Preview Modal */}
      <BoardViewModal
        isOpen={isBoardVisible}
        onClose={() => setIsBoardVisible(false)}
        fen={displayFen}
        playerSide={color}
        lastMove={preferences.highlightLastMove && currentPosition !== -2 ? lastMove : null}
        preferences={preferences}
        movesLength={pgnMoves.length}
        currentPosition={currentPosition}
        formattedPgn={formattedPgn}
        onNavigateToStart={navigateToStart}
        onNavigatePrevious={navigatePrevious}
        onNavigateNext={navigateNext}
        onNavigateToEnd={navigateToEnd}
        onNavigateToPosition={navigateToPosition}
      />
    </div>
  );
}
