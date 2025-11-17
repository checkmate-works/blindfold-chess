'use client';

import { useEffect, useState } from 'react';

import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';

import { Button } from '@/app/_components';
import { Chess } from 'chess.js';

import type { AlgebraicNotation, Side, SkillLevel } from '@/lib/types';

import { SectionTitle } from '@/app/[locale]/_components';
import type { Locale } from '@/app/[locale]/_lib/types';
import { parsePgn, validatePgn } from '@/app/[locale]/play/_lib/pgn-parser';

import { ColorSelector } from './ColorSelector';
import { PgnInput } from './PgnInput';
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
  const [startMethod, setStartMethod] = useState<StartMethod>('new');
  const [color, setColor] = useState<Side>('white');
  const [skillLevel, setSkillLevel] = useState<SkillLevel>(5);
  const [pgn, setPgn] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [colorLockedFromUrl, setColorLockedFromUrl] = useState(false);

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
        className="w-full rounded-lg font-semibold"
      >
        {t('startGame')}
      </Button>
    </div>
  );
}
