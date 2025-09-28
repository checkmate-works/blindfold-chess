'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Chess } from 'chess.js';
import { StartMethodSelector } from './StartMethodSelector';
import { ColorSelector } from './ColorSelector';
import { SkillLevelSelector } from './SkillLevelSelector';
import { PgnInput } from './PgnInput';
import { SectionTitle } from '../../../_components/SectionTitle';
import { validatePgn, parsePgn } from '../../../play/_lib/pgn-parser';
import type { Side, SkillLevel } from '@/lib/types';
import type { Locale } from '../../../_lib/types';

type StartMethod = 'new' | 'pgn';

type Props = {
  locale: Locale;
};

export function NewGameForm({ locale }: Props) {
  const t = useTranslations('newGame');
  const router = useRouter();
  const [startMethod, setStartMethod] = useState<StartMethod>('new');
  const [color, setColor] = useState<Side>('white');
  const [skillLevel, setSkillLevel] = useState<SkillLevel>(5);
  const [pgn, setPgn] = useState('');
  const [pgnError, setPgnError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Auto-derive color from PGN when PGN method is selected
  useEffect(() => {
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
  }, [startMethod, pgn]);

  const handlePgnChange = (value: string) => {
    setPgn(value);
    setPgnError(null);

    // Real-time validation
    if (value.trim() && !validatePgn(value)) {
      setPgnError(t('invalidPgn'));
    }
  };

  const handleStartGame = async () => {
    setIsLoading(true);

    try {
      let moves: string[] | undefined;
      if (startMethod === 'pgn') {
        if (!pgn.trim()) {
          setPgnError(t('invalidPgn'));
          setIsLoading(false);
          return;
        }

        if (!validatePgn(pgn)) {
          setPgnError(t('invalidPgn'));
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
    } catch {
      setPgnError(t('invalidPgn'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Start Method Selector */}
      <div>
        <SectionTitle>{t('startMethod')}</SectionTitle>
        <StartMethodSelector value={startMethod} onChange={setStartMethod} />
      </div>

      {/* PGN Input (only show if pgn method selected) */}
      {startMethod === 'pgn' && (
        <div>
          <SectionTitle>{t('pgnTitle')}</SectionTitle>
          <PgnInput value={pgn} onChange={handlePgnChange} error={pgnError} />
        </div>
      )}

      {/* Color Selection (disabled when using PGN with valid moves) */}
      <div>
        <SectionTitle>{t('selectColor')}</SectionTitle>
        <ColorSelector
          value={color}
          onChange={setColor}
          disabled={startMethod === 'pgn' && !!pgn.trim() && validatePgn(pgn)}
        />
        {startMethod === 'pgn' && pgn.trim() && validatePgn(pgn) && (
          <p className="text-sm text-muted-foreground mt-2">{t('derivedFromPgn')}</p>
        )}
      </div>

      {/* Skill Level Selection */}
      <div>
        <SectionTitle>{t('selectLevel')}</SectionTitle>
        <SkillLevelSelector value={skillLevel} onChange={setSkillLevel} />
      </div>

      {/* Action Button */}
      <div className="pt-4">
        <button
          onClick={handleStartGame}
          disabled={isLoading || (startMethod === 'pgn' && (!pgn.trim() || !!pgnError))}
          className="w-full px-6 py-3 bg-foreground text-background hover:bg-foreground/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
        >
          {isLoading ? '...' : t('startGame')}
        </button>
      </div>
    </>
  );
}
