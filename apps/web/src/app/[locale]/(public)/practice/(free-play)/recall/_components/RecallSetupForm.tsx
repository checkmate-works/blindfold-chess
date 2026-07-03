'use client';

import { useCallback, useEffect, useState } from 'react';

import { useRouter } from 'next/navigation';

import { Button } from '@/app/_components';
import { useSafeLocale as useLocale } from '@/i18n/use-safe-locale';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { getPgnHeaders, getPgnHistory } from '@blindfold-chess/features/chess-core';
import type { Side } from '@blindfold-chess/types';

import { ColorSelector } from '@/app/[locale]/(public)/games/new/_components/ColorSelector';
import { parsePgnWithFen, validatePgn } from '@/app/[locale]/(public)/games/play/_lib/pgn-parser';
import { PgnInput } from '@/app/[locale]/_components/PgnInput';
import { SectionTitle } from '@/app/[locale]/_components/SectionTitle';

/**
 * Standalone entry point for the recall review: paste any PGN (your own
 * game, someone else's, an opening line) and replay it from memory — no
 * associated saved game required. Mirrors `games/new/pgn/_components/PgnGameForm.tsx`'s
 * paste → derive color → navigate flow, minus the engine/skill-level fields
 * that flow needs and this one doesn't.
 */
export function RecallSetupForm() {
  const t = useTranslations('recall');
  const router = useRouter();
  const locale = useLocale();

  const [pgn, setPgn] = useState('');
  const [color, setColor] = useState<Side>('white');
  const [colorManuallySet, setColorManuallySet] = useState(false);

  // Auto-derive color from the pasted PGN (whoever moves next), unless the
  // user has explicitly overridden it.
  useEffect(() => {
    if (colorManuallySet) return;
    if (!pgn.trim() || !validatePgn(pgn)) return;

    try {
      const history = getPgnHistory(pgn, { verbose: true }) as { color: string }[];
      if (history.length > 0) {
        const lastMoveEntry = history[history.length - 1];
        setColor(lastMoveEntry.color === 'w' ? 'black' : 'white');
      } else {
        const turnFromFen = getPgnHeaders(pgn).FEN?.split(' ')[1];
        if (turnFromFen) setColor(turnFromFen === 'w' ? 'white' : 'black');
      }
    } catch {
      // Keep the current selection if the PGN can't be parsed yet.
    }
  }, [pgn, colorManuallySet]);

  const handleColorChange = useCallback((next: Side) => {
    setColor(next);
    setColorManuallySet(true);
  }, []);

  const isStartDisabled = !pgn.trim() || !validatePgn(pgn);

  const handleStart = () => {
    const { moves, startingFen } = parsePgnWithFen(pgn);
    const params = new URLSearchParams({ color });
    params.set('moves', JSON.stringify(moves));
    if (startingFen) params.set('fen', startingFen);
    router.push(`/${locale}/practice/recall?${params.toString()}`);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{t('setup.description')}</p>
      <div>
        <SectionTitle>{t('setup.pgnLabel')}</SectionTitle>
        <div className="mt-3">
          <PgnInput value={pgn} onChange={setPgn} />
        </div>
      </div>
      <ColorSelector value={color} onChange={handleColorChange} />
      <Button
        onClick={handleStart}
        disabled={isStartDisabled}
        variant="primary"
        size="lg"
        className="w-full"
      >
        {t('setup.startButton')}
      </Button>
    </div>
  );
}
