'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

import { Button } from '@/app/_components';
import { Link } from '@/i18n/routing';
import { FaPlay } from 'react-icons/fa';

import { CardLink, SectionTitle } from '@/app/[locale]/_components';

import { getRandomSquare } from '../_lib/utils';

type Props = {
  startingSquare: string;
  onStartingSquareChange: (square: string) => void;
  blindfoldMode: boolean;
  onBlindfoldModeChange: (value: boolean) => void;
};

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];

export function KnightTourSetup({
  startingSquare,
  onStartingSquareChange,
  blindfoldMode,
  onBlindfoldModeChange,
}: Props) {
  const locale = useLocale();
  const router = useRouter();
  const t = useTranslations('practice.knightTour');

  const handleStart = () => {
    // Resolve random to actual square
    const actualSquare = startingSquare === 'random' ? getRandomSquare() : startingSquare;

    // Build query params
    const params = new URLSearchParams();
    params.set('startingSquare', actualSquare);
    if (blindfoldMode) {
      params.set('blindfold', '1');
    }

    router.push(`/${locale}/practice/knight-tour/session?${params.toString()}#knight-tour-session`);
  };

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

        <Button
          onClick={handleStart}
          variant="primary"
          size="lg"
          icon={<FaPlay />}
          className="w-full"
        >
          {t('start')}
        </Button>

        <div className="mt-4 text-center">
          <Link
            href="/practice/knight-tour/tutorial"
            locale={locale}
            className="text-sm text-muted-foreground underline hover:text-foreground transition-colors"
          >
            {t('viewTutorial')}
          </Link>
        </div>
      </div>

      <div className="mt-8 space-y-4">
        <SectionTitle>{t('relatedArticles')}</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <CardLink
            href="/learn/practice/knight-tour"
            icon="♞"
            title={t('articles.knightTour.title')}
            description={t('articles.knightTour.description')}
            locale={locale}
          />
          <CardLink
            href="/learn/moves/knight-movement"
            icon="♘"
            title={t('articles.knightMovement.title')}
            description={t('articles.knightMovement.description')}
            locale={locale}
          />
        </div>
      </div>
    </div>
  );
}
