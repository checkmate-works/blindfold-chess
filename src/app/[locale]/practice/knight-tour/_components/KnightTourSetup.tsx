'use client';

import { useTranslations } from 'next-intl';

import { Button } from '@/app/_components';
import { FaPlay } from 'react-icons/fa';

import { SectionTitle } from '@/app/[locale]/_components';

type Props = {
  startingSquare: string;
  onStartingSquareChange: (square: string) => void;
  onStart: () => void;
};

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];

export function KnightTourSetup({ startingSquare, onStartingSquareChange, onStart }: Props) {
  const t = useTranslations('practice.knightTour');

  return (
    <div>
      <div className="bg-card rounded-xl shadow-sm border border-border p-6">
        <SectionTitle className="mb-4">{t('settings')}</SectionTitle>

        <div className="mb-6">
          <label className="block text-sm font-medium text-muted-foreground mb-2">
            {t('startingSquare')}
          </label>

          <div className="mb-4">
            <select
              value={startingSquare}
              onChange={(e) => onStartingSquareChange(e.target.value)}
              className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground"
            >
              <option value="random">{t('randomSquare')}</option>
              {RANKS.map((rank) =>
                FILES.map((file) => (
                  <option key={`${file}${rank}`} value={`${file}${rank}`}>
                    {`${file}${rank}`}
                  </option>
                ))
              )}
            </select>
          </div>

          <p className="text-sm text-muted-foreground">{t('setupHint')}</p>
        </div>

        <Button
          onClick={onStart}
          variant="primary"
          size="lg"
          icon={<FaPlay />}
          className="w-full rounded-lg font-semibold"
        >
          {t('start')}
        </Button>
      </div>
    </div>
  );
}
