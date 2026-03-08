'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';

import { Button } from '@/app/_components';
import {
  getLastMoveDetails,
  getPgnHeaders,
  getPgnHistory,
} from '@blindfold-chess/features/chess-core';
import type { AlgebraicNotation, Side } from '@blindfold-chess/types';
import { FaEye } from 'react-icons/fa';

import type { SkillLevel } from '@/lib/types';

import { CollapsibleGameSettings } from '@/app/[locale]/(public)/games/new/_components/CollapsibleGameSettings';
import { ColorSelector } from '@/app/[locale]/(public)/games/new/_components/ColorSelector';
import { SkillLevelSelector } from '@/app/[locale]/(public)/games/new/_components/SkillLevelSelector';
import { BoardViewModal } from '@/app/[locale]/(public)/games/play/_components/BoardViewModal';
import { useMoveNavigation } from '@/app/[locale]/(public)/games/play/_hooks/use-move-navigation';
import { parsePgnWithFen, validatePgn } from '@/app/[locale]/(public)/games/play/_lib/pgn-parser';
import { PgnInput, SectionTitle } from '@/app/[locale]/_components';
import type { PerGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import type { Locale } from '@/app/[locale]/_lib/types';

type Props = {
  locale: Locale;
};

export function PgnGameForm({ locale }: Props) {
  const t = useTranslations('newGame');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { preferences } = useGamePreferences();
  const [color, setColor] = useState<Side>('white');
  const [skillLevel, setSkillLevel] = useState<SkillLevel>(5);
  const [pgn, setPgn] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [colorLockedFromUrl, setColorLockedFromUrl] = useState(false);
  const [isBoardVisible, setIsBoardVisible] = useState(false);

  // Initialize local per-game settings from global preferences
  const [localSettings, setLocalSettings] = useState<PerGamePreferences>({
    showBoardButtonInGame: preferences.showBoardButtonInGame,
    highlightLastMove: preferences.highlightLastMove,
    showOwnPieces: preferences.showOwnPieces,
    showOpponentPieces: preferences.showOpponentPieces,
    pieceShapeMode: preferences.pieceShapeMode,
    pieceColors: preferences.pieceColors,
  });

  const handleSettingsChange = (updates: Partial<PerGamePreferences>) => {
    setLocalSettings((prev) => ({ ...prev, ...updates }));
  };

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
      const movesUpToPosition = pgnMoves.slice(0, position + 1) as string[];
      return getLastMoveDetails(movesUpToPosition, startingFen);
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
          const pgnParts: string[] = [];

          if (urlFen) {
            pgnParts.push(`[SetUp "1"]`);
            pgnParts.push(`[FEN "${urlFen}"]`);
            pgnParts.push('');
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
        }
      } catch (error) {
        console.error('Failed to parse moves from URL:', error);
      }
    }

    if (urlColor) {
      setColor(urlColor);
      setColorLockedFromUrl(true);
    }

    if (urlSkillLevel) {
      const level = parseInt(urlSkillLevel);
      if (level >= 1 && level <= 20) {
        setSkillLevel(level as SkillLevel);
      }
    }
  }, [searchParams]);

  // Auto-derive color from PGN
  // Skip auto-derivation if color was set from URL
  useEffect(() => {
    if (colorLockedFromUrl) return;

    if (pgn.trim() && validatePgn(pgn)) {
      try {
        const history = getPgnHistory(pgn, { verbose: true }) as { color: string }[];

        if (history.length > 0) {
          const lastMoveEntry = history[history.length - 1];
          const derivedColor: Side = lastMoveEntry.color === 'w' ? 'black' : 'white';
          setColor(derivedColor);
        } else {
          const headers = getPgnHeaders(pgn);
          if (headers.FEN) {
            const fenParts = headers.FEN.split(' ');
            if (fenParts.length >= 2) {
              const turnFromFen = fenParts[1];
              const derivedColor: Side = turnFromFen === 'w' ? 'white' : 'black';
              setColor(derivedColor);
            }
          }
        }
      } catch {
        // If PGN parsing fails, keep current color selection
      }
    }
  }, [pgn, colorLockedFromUrl]);

  const handlePgnChange = useCallback((value: string) => {
    setPgn(value);
  }, []);

  const handleStartGame = () => {
    setIsLoading(true);

    if (!pgn.trim() || !validatePgn(pgn)) {
      setIsLoading(false);
      return;
    }

    const parsed = parsePgnWithFen(pgn);
    const moves = parsed.moves;
    const fenToPass = parsed.startingFen;

    const params = new URLSearchParams({
      color,
      skillLevel: skillLevel.toString(),
      gamePrefs: JSON.stringify(localSettings),
    });

    if (moves && moves.length > 0) {
      params.set('moves', JSON.stringify(moves));
    }

    if (fenToPass) {
      params.set('fen', fenToPass);
    }

    router.push(`/${locale}/games/play?${params.toString()}`);
  };

  const isStartDisabled = !pgn.trim() || !validatePgn(pgn);

  return (
    <div className="space-y-4">
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

      {/* Color Selection */}
      <SectionTitle>{t('selectColor')}</SectionTitle>
      <ColorSelector
        value={color}
        onChange={(newColor) => {
          setColor(newColor);
          setColorLockedFromUrl(false);
        }}
        disabled={!colorLockedFromUrl && !!pgn.trim() && validatePgn(pgn)}
      />
      {pgn.trim() && validatePgn(pgn) && !colorLockedFromUrl && (
        <p className="text-sm text-muted-foreground">{t('derivedFromPgn')}</p>
      )}

      {/* Skill Level Selection */}
      <SkillLevelSelector value={skillLevel} onChange={setSkillLevel} />

      <SectionTitle>{t('gameSettings')}</SectionTitle>
      <CollapsibleGameSettings settings={localSettings} onSettingsChange={handleSettingsChange} />

      <Button
        onClick={handleStartGame}
        disabled={isStartDisabled}
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
