'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Chess } from 'chess.js';
import { StartMethodSelector } from './StartMethodSelector';
import { ColorSelector } from './ColorSelector';
import { SkillLevelSelector } from './SkillLevelSelector';
import { PgnInput } from './PgnInput';
import { SectionTitle, PrimaryButton } from '../../../_components';
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
    <div className="space-y-4">
      {/* Start Method Selector */}
      <SectionTitle>{t('startMethod')}</SectionTitle>
      <StartMethodSelector value={startMethod} onChange={setStartMethod} />

      {/* PGN Input (only show if pgn method selected) */}
      {startMethod === 'pgn' && (
        <>
          <SectionTitle>{t('pgnTitle')}</SectionTitle>
          <PgnInput value={pgn} onChange={handlePgnChange} error={pgnError} />
        </>
      )}

      {/* Color Selection (disabled when using PGN with valid moves) */}
      <SectionTitle>{t('selectColor')}</SectionTitle>
      <ColorSelector
        value={color}
        onChange={setColor}
        disabled={startMethod === 'pgn' && !!pgn.trim() && validatePgn(pgn)}
      />
      {startMethod === 'pgn' && pgn.trim() && validatePgn(pgn) && (
        <p className="text-sm text-muted-foreground">{t('derivedFromPgn')}</p>
      )}

      {/* Skill Level Selection */}
      <SectionTitle>{t('selectLevel')}</SectionTitle>
      <SkillLevelSelector value={skillLevel} onChange={setSkillLevel} />

      <PrimaryButton
        onClick={handleStartGame}
        disabled={startMethod === 'pgn' && (!pgn.trim() || !!pgnError)}
        loading={isLoading}
      >
        {t('startGame')}
      </PrimaryButton>
    </div>
  );
}
