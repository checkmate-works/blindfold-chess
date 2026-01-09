'use client';

import { useEffect, useState } from 'react';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

import { Button } from '@/app/_components';
import { FaPlay } from 'react-icons/fa';

import { SectionTitle } from '@/app/[locale]/_components';
import type { Locale } from '@/app/[locale]/_lib/types';

import { FEN_PROBLEMS } from '../_data/positions';

type Props = {
  locale: Locale;
};

export function FenSetup({ locale }: Props) {
  const t = useTranslations('practice.fen');
  const router = useRouter();

  const maxProblems = FEN_PROBLEMS.length;

  // Default values
  const defaultSettings = {
    problemCount: maxProblems,
    shuffleProblems: true,
  };

  const [problemCount, setProblemCount] = useState(defaultSettings.problemCount);
  const [shuffleProblems, setShuffleProblems] = useState(defaultSettings.shuffleProblems);
  const [hasLoadedSettings, setHasLoadedSettings] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('fenPracticeSettings');
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        setProblemCount(settings.problemCount ?? defaultSettings.problemCount);
        setShuffleProblems(settings.shuffleProblems ?? defaultSettings.shuffleProblems);
      } catch (error) {
        console.error('Failed to load FEN practice settings:', error);
      }
    }
    setHasLoadedSettings(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    if (!hasLoadedSettings) {
      return;
    }

    const settings = {
      problemCount,
      shuffleProblems,
    };
    localStorage.setItem('fenPracticeSettings', JSON.stringify(settings));
  }, [problemCount, shuffleProblems, hasLoadedSettings]);

  const handleStart = () => {
    const params = new URLSearchParams();
    params.set('count', problemCount.toString());
    params.set('shuffle', shuffleProblems ? '1' : '0');

    router.push(`/${locale}/practice/fen/session?${params.toString()}`);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-card rounded-2xl p-6 shadow-sm border border-border mb-8">
        <SectionTitle className="text-xl mb-4">{t('settings')}</SectionTitle>

        <div className="space-y-6">
          {/* Problem Count */}
          <div>
            <label
              htmlFor="problemCount"
              className="block text-sm font-medium text-foreground mb-2"
            >
              {t('problemCount')}: {problemCount} {problemCount > 1 ? t('problems') : ''}
            </label>
            <input
              id="problemCount"
              type="range"
              min="1"
              max={maxProblems}
              step="1"
              value={problemCount}
              onChange={(e) => setProblemCount(parseInt(e.target.value))}
              className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-foreground"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>1</span>
              <span>{maxProblems}</span>
            </div>
          </div>

          {/* Shuffle Problems */}
          {problemCount > 1 && (
            <div className="flex items-center justify-between">
              <label htmlFor="shuffle" className="text-sm font-medium text-foreground">
                {t('shuffle')}
              </label>
              <button
                id="shuffle"
                type="button"
                role="switch"
                aria-checked={shuffleProblems}
                onClick={() => setShuffleProblems(!shuffleProblems)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  shuffleProblems ? 'bg-foreground' : 'bg-secondary'
                }`}
              >
                <span className="sr-only">{t('shuffle')}</span>
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${
                    shuffleProblems ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          )}
        </div>

        <Button
          onClick={handleStart}
          variant="primary"
          size="lg"
          className="w-full rounded-lg font-semibold mt-6"
          icon={<FaPlay />}
        >
          {t('start')}
        </Button>
      </div>
    </div>
  );
}
