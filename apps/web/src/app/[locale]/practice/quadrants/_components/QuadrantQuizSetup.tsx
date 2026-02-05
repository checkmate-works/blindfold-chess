'use client';

import { useEffect, useState } from 'react';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

import { Button } from '@/app/_components';
import { FaPlay } from 'react-icons/fa';

import { getBoardThemeColors } from '@/lib/boardThemes';

import { BetaNotice, CardLink, SectionTitle } from '@/app/[locale]/_components';
import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import type { Locale } from '@/app/[locale]/_lib/types';
import { ProblemCountSlider } from '@/app/[locale]/practice/_components/ProblemCountSlider';

type Props = {
  locale: Locale;
};

type BoardOrientation = 'white' | 'black' | 'random';

const STORAGE_KEY = 'quadrantAnchors_settings';
const DEFAULT_PROBLEM_COUNT = 10;
const DEFAULT_ORIENTATION: BoardOrientation = 'white';

export default function QuadrantQuizSetup({ locale }: Props) {
  const t = useTranslations('practice.quadrantAnchors');
  const tSettings = useTranslations('practice.settings');
  const tQuiz = useTranslations('practice.coordinateQuiz'); // Reusing translations for orientation
  const router = useRouter();
  const { preferences } = useGamePreferences();
  const themeColors = getBoardThemeColors(preferences.boardTheme);

  const [problemCount, setProblemCount] = useState(DEFAULT_PROBLEM_COUNT);
  const [orientation, setOrientation] = useState<BoardOrientation>(DEFAULT_ORIENTATION);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const settings = JSON.parse(saved);
        if (settings.problemCount) setProblemCount(settings.problemCount);
        if (settings.orientation) setOrientation(settings.orientation);
      } catch {
        // ignore
      }
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ problemCount, orientation }));
    }
  }, [problemCount, orientation, isLoaded]);

  const handleStart = () => {
    router.push(
      `/${locale}/practice/quadrants/session?count=${problemCount}&orientation=${orientation}`
    );
  };

  if (!isLoaded) return null;

  return (
    <div>
      <div className="bg-card rounded-xl shadow-sm border border-border p-6 mb-8">
        <SectionTitle className="mb-4">{tSettings('title')}</SectionTitle>

        <BetaNotice className="mb-6">
          <p>{t('betaNotice')}</p>
        </BetaNotice>

        <div className="mb-6 text-muted-foreground">
          <p>{t('description')}</p>
        </div>

        <div className="space-y-8">
          {/* Problem Count */}
          <div>
            <ProblemCountSlider
              count={problemCount}
              onCountChange={setProblemCount}
              labels={{
                count: tSettings('problemCount'),
                unit: tSettings('problems'),
              }}
            />
          </div>

          {/* Board Orientation */}
          <div className="flex flex-col gap-2">
            <label className="block text-sm font-medium text-foreground">
              {tQuiz('boardOrientation')}
            </label>
            <div className="flex justify-center gap-6">
              {/* White */}
              <button
                onClick={() => setOrientation('white')}
                className={`flex flex-col items-center gap-2 transition-all ${
                  orientation === 'white' ? 'scale-105' : 'opacity-60 hover:opacity-80'
                }`}
                title={tQuiz('white')}
              >
                <span
                  className={`w-16 h-16 rounded-md border-2 ${themeColors.light} ${
                    orientation === 'white' ? 'border-primary' : 'border-border'
                  } shadow-sm`}
                />
                <span className="text-sm font-medium">{tQuiz('white')}</span>
              </button>

              {/* Black */}
              <button
                onClick={() => setOrientation('black')}
                className={`flex flex-col items-center gap-2 transition-all ${
                  orientation === 'black' ? 'scale-105' : 'opacity-60 hover:opacity-80'
                }`}
                title={tQuiz('black')}
              >
                <span
                  className={`w-16 h-16 rounded-md border-2 ${themeColors.dark} ${
                    orientation === 'black' ? 'border-primary' : 'border-border'
                  } shadow-sm`}
                />
                <span className="text-sm font-medium">{tQuiz('black')}</span>
              </button>

              {/* Random */}
              <button
                onClick={() => setOrientation('random')}
                className={`flex flex-col items-center gap-2 transition-all ${
                  orientation === 'random' ? 'scale-105' : 'opacity-60 hover:opacity-80'
                }`}
                title={tQuiz('random')}
              >
                <span
                  className={`w-16 h-16 rounded-md border-2 overflow-hidden ${
                    orientation === 'random' ? 'border-primary' : 'border-border'
                  } shadow-sm flex`}
                >
                  <span className={`w-1/2 h-full ${themeColors.light}`} />
                  <span className={`w-1/2 h-full ${themeColors.dark}`} />
                </span>
                <span className="text-sm font-medium">{tQuiz('random')}</span>
              </button>
            </div>
          </div>
        </div>

        <Button
          onClick={handleStart}
          variant="primary"
          size="lg"
          className="w-full mt-8"
          icon={<FaPlay />}
        >
          {tSettings('start')}
        </Button>
      </div>

      <div className="space-y-4">
        <SectionTitle>{t('relatedArticles')}</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <CardLink
            href="/learn/coordinates/anchor-squares"
            icon="⚓"
            title={t('articles.anchorSquares.title')}
            description={t('articles.anchorSquares.description')}
            locale={locale}
          />
        </div>
      </div>
    </div>
  );
}
