'use client';

import { useEffect, useMemo, useState } from 'react';

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
import { useMoveNavigation } from '@/app/[locale]/play/_hooks/use-move-navigation';
import { parsePgnWithFen, validatePgn } from '@/app/[locale]/play/_lib/pgn-parser';

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

  // Parse PGN to get moves array and starting FEN
  const { pgnMoves, startingFen } = useMemo((): {
    pgnMoves: AlgebraicNotation[];
    startingFen?: string;
  } => {
    if (!pgn.trim() || !validatePgn(pgn)) return { pgnMoves: [] };
    try {
      const result = parsePgnWithFen(pgn);
      return {
        pgnMoves: result.moves as AlgebraicNotation[],
        startingFen: result.startingFen,
      };
    } catch {
      return { pgnMoves: [] };
    }
  }, [pgn]);

  // Use navigation hook
  const {
    currentPosition,
    displayFen: hookDisplayFen,
    navigateToPosition,
    navigateToStart,
    navigatePrevious,
    navigateNext,
    navigateToEnd,
    latestFen,
  } = useMoveNavigation({
    moves: pgnMoves,
    startingFen,
  });

  // Current display FEN
  const displayFen = useMemo(() => {
    if (hookDisplayFen) return hookDisplayFen;
    // Default to latest position (calculated by hook)
    return latestFen;
  }, [hookDisplayFen, latestFen]);

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
      // Initialize with custom FEN or standard starting position
      const chess = startingFen ? new Chess(startingFen) : new Chess();
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
  }, [pgnMoves, currentPosition, startingFen]);

  // Initialize from URL parameters
  useEffect(() => {
    const urlMoves = searchParams.get('moves');
    const urlColor = searchParams.get('color') as Side | null;
    const urlSkillLevel = searchParams.get('skillLevel');
    const urlFen = searchParams.get('fen');

    if (urlMoves) {
      try {
        const movesArray = JSON.parse(urlMoves) as AlgebraicNotation[];
        if (movesArray.length > 0) {
          // Convert moves array to PGN format
          const pgnParts: string[] = [];

          // Add FEN header if custom starting position is provided
          if (urlFen) {
            pgnParts.push(`[SetUp "1"]`);
            pgnParts.push(`[FEN "${urlFen}"]`);
            pgnParts.push(''); // Empty line between headers and moves
          }

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
          const pgnText = pgnParts.join(urlFen ? '\n' : ' ');
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
        } else {
          // No moves in PGN, check if there's a custom starting FEN
          // FEN format: "position turn castling en_passant halfmove fullmove"
          // The turn is the second field: 'w' for white, 'b' for black
          const headers = chess.header();
          if (headers.FEN) {
            const fenParts = headers.FEN.split(' ');
            if (fenParts.length >= 2) {
              const turnFromFen = fenParts[1];
              // User should play as the side to move
              const derivedColor: Side = turnFromFen === 'w' ? 'white' : 'black';
              setColor(derivedColor);
            }
          }
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
      let fenToPass: string | undefined;

      if (startMethod === 'pgn') {
        if (!pgn.trim() || !validatePgn(pgn)) {
          setIsLoading(false);
          return;
        }

        // Use parsePgnWithFen to get both moves and starting FEN
        const parsed = parsePgnWithFen(pgn);
        moves = parsed.moves;
        fenToPass = parsed.startingFen;
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

      // Add custom starting FEN if present
      if (fenToPass) {
        searchParams.set('fen', fenToPass);
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
          {(pgnMoves.length > 0 || startingFen) && (
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
