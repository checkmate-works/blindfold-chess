'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { BoardSkeleton, Button } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { validateFenFormat as validateFEN } from '@blindfold-chess/features/chess-core/fen';
import { FaPlay } from 'react-icons/fa';

import { CardLink, SectionTitle } from '@/app/[locale]/_components';
import { ConfirmationModal } from '@/app/[locale]/_components/ConfirmationModal';
import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import type { Locale } from '@/app/[locale]/_lib/types';

import { TUTORIAL_SKIP_CONFIG } from '../../../_lib/tutorial-skip-config';
import type { PresetPosition } from '../_data/positions';
import presetPositions from '../_data/presetPositions.json';
import { useFenSettings } from '../_hooks/use-fen-settings';
import { CustomFenSection } from './CustomFenSection';
import { PresetProblemSection } from './PresetProblemSection';

const TUTORIAL_SKIPPED_KEY = TUTORIAL_SKIP_CONFIG.fen.storageKey;

type Props = {
  locale: Locale;
};

export function FenSetup({ locale }: Props) {
  const t = useTranslations('practice.fen');
  const router = useRouter();
  const { preferences, isLoaded } = useGamePreferences();
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  const {
    problemCount,
    setProblemCount,
    shuffleProblems,
    setShuffleProblems,
    useCustomFen,
    setUseCustomFen,
    customFenInput,
    setCustomFenInput,
    customFenError,
    customFenCount,
    presetCount,
  } = useFenSettings();

  const handleStart = () => {
    const params = new URLSearchParams();
    params.set('shuffle', shuffleProblems ? '1' : '0');

    if (useCustomFen) {
      const fens = customFenInput
        .trim()
        .split('\n')
        .filter((line: string) => line.trim());

      if (fens.length === 0 || fens.some((fen: string) => !validateFEN(fen.trim()))) {
        return;
      }

      const encoded = btoa(fens.join('\n'));
      params.set('problems', encoded);
      const effectiveCount = Math.min(problemCount, fens.length);
      params.set('count', effectiveCount.toString());
      params.set('source', 'custom');
    } else {
      const presetFens = (presetPositions as PresetPosition[]).map((p) => p.fen);
      const encoded = btoa(presetFens.join('\n'));
      params.set('problems', encoded);
      const effectiveCount = Math.min(problemCount, presetFens.length);
      params.set('count', effectiveCount.toString());
      params.set('source', 'preset');
    }

    router.push(`/${locale}/practice/fen/session?${params.toString()}#fen-session`);
  };

  const handleResetConfirm = () => {
    localStorage.removeItem('fenPracticeSettings');
    localStorage.removeItem(TUTORIAL_SKIPPED_KEY);
    setIsResetConfirmOpen(false);
    router.push(`/${locale}/practice/fen/tutorial`);
  };

  return (
    <>
      <div className="mb-8">
        <div className="space-y-6">
          {/* Problem Source */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              {t('problemSource')}
            </label>
            <div className="flex rounded-lg bg-secondary p-1">
              <button
                type="button"
                onClick={() => setUseCustomFen(false)}
                className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  !useCustomFen
                    ? 'bg-card text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t('presetProblems')}
              </button>
              <button
                type="button"
                onClick={() => setUseCustomFen(true)}
                className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  useCustomFen
                    ? 'bg-card text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t('enterFen')}
              </button>
            </div>
          </div>

          {!useCustomFen &&
            (!isLoaded ? (
              <div className="flex justify-center">
                <div className="w-full max-w-xs">
                  <BoardSkeleton />
                </div>
              </div>
            ) : (
              <PresetProblemSection
                problemCount={problemCount}
                presetCount={presetCount}
                shuffleProblems={shuffleProblems}
                boardTheme={preferences.boardTheme}
                onProblemCountChange={setProblemCount}
                onShuffleChange={setShuffleProblems}
              />
            ))}

          {useCustomFen && (
            <CustomFenSection
              customFenInput={customFenInput}
              customFenError={customFenError}
              customFenCount={customFenCount}
              problemCount={problemCount}
              shuffleProblems={shuffleProblems}
              onCustomFenInputChange={setCustomFenInput}
              onProblemCountChange={setProblemCount}
              onShuffleChange={setShuffleProblems}
            />
          )}
        </div>

        <Button
          onClick={handleStart}
          disabled={useCustomFen && (customFenError !== null || !customFenInput.trim())}
          variant="primary"
          size="lg"
          className="w-full mt-6"
          icon={<FaPlay />}
        >
          {t('start')}
        </Button>
      </div>

      <div className="mt-8 flex justify-end">
        <Button variant="destructive" onClick={() => setIsResetConfirmOpen(true)}>
          {t('resetSettings')}
        </Button>
      </div>

      <div className="mt-8 space-y-3">
        <SectionTitle>{t('requiredKnowledge')}</SectionTitle>
        <CardLink
          href="/learn/notation/fen-notation"
          icon="📝"
          title={t('viewArticle')}
          description={t('articleDescription')}
          locale={locale}
        />
      </div>

      <ConfirmationModal
        isOpen={isResetConfirmOpen}
        title={t('resetSettingsConfirm.title')}
        message={t('resetSettingsConfirm.message')}
        confirmText={t('resetSettings')}
        cancelText={t('cancel')}
        confirmVariant="danger"
        onConfirm={handleResetConfirm}
        onCancel={() => setIsResetConfirmOpen(false)}
      />
    </>
  );
}
