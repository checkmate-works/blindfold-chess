'use client';

import { useTranslations } from 'next-intl';

import { Button } from '@/app/_components';
import { FaPlay } from 'react-icons/fa';

import { SectionTitle } from '@/app/[locale]/_components';

type Props = {
  startingSquare: string;
  onStartingSquareChange: (square: string) => void;
  blindfoldMode: boolean;
  onBlindfoldModeChange: (value: boolean) => void;
  onStart: () => void;
};

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];

export function KnightTourSetup({
  startingSquare,
  onStartingSquareChange,
  blindfoldMode,
  onBlindfoldModeChange,
  onStart,
}: Props) {
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
        </div>

        {/* Blindfold Mode Toggle */}
        <div className="mb-6">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={blindfoldMode}
              onChange={(e) => onBlindfoldModeChange(e.target.checked)}
              className="w-5 h-5 rounded border-border text-primary focus:ring-primary"
            />
            <div>
              <span className="text-sm font-medium text-foreground">{t('blindfoldMode')}</span>
              <p className="text-sm text-muted-foreground">{t('blindfoldModeHint')}</p>
            </div>
          </label>
        </div>

        <p className="text-sm text-muted-foreground mb-6">{t('setupHint')}</p>

        <Button onClick={onStart} variant="primary" size="lg" icon={<FaPlay />} className="w-full">
          {t('start')}
        </Button>
      </div>
    </div>
  );
}
