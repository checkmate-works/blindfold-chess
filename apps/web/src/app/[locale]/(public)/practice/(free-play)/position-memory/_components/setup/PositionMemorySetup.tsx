'use client';

import { useCallback, useEffect, useState } from 'react';

import { useRouter } from 'next/navigation';

import { BoardSkeleton, Button } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FaPlay } from 'react-icons/fa';

import { useCopyToClipboard } from '@/app/[locale]/(public)/practice/(free-play)/_hooks/use-copy-to-clipboard';
import { CardLink, SectionTitle } from '@/app/[locale]/_components';
import { ConfirmationModal } from '@/app/[locale]/_components/ConfirmationModal';
import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import type { Locale } from '@/app/[locale]/_lib/types';

import type { PresetPosition } from '../../_data/positions';
import presetPositions from '../../_data/presetPositions.json';
import { usePositionMemorySettings } from '../../_hooks/use-position-memory-settings';
import { encodeFensToBase64, generateShareUrl, validateFEN } from '../../_lib/share-url';
import { TUTORIAL_SKIPPED_KEY } from '../TutorialSkipLink';
import { PositionMemorySettings } from './PositionMemorySettings';

const MAX_FEN_COUNT = 10;

type Props = {
  locale: Locale;
  urlError?: string | null;
  urlFens?: string[] | null;
  urlTimeLimit?: number | null;
  urlShuffle?: boolean | null;
};

export function PositionMemorySetup({
  locale,
  urlError,
  urlFens,
  urlTimeLimit,
  urlShuffle,
}: Props) {
  const t = useTranslations('practice.positionMemory');
  const router = useRouter();
  const { preferences, isLoaded } = useGamePreferences();

  const { settings, updateSettings, saveSettings, clearSettings } = usePositionMemorySettings({
    urlFens,
    urlTimeLimit,
    urlShuffle,
  });

  const { timeLimit, problemCount, shuffleProblems, useCustomFen, customFenInput } = settings;

  const [customFenError, setCustomFenError] = useState<string | null>(urlError || null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  // Validate custom FEN when input changes
  useEffect(() => {
    if (useCustomFen && customFenInput.trim()) {
      const lines = customFenInput
        .trim()
        .split('\n')
        .filter((line: string) => line.trim());

      // Check line count limit
      if (lines.length > MAX_FEN_COUNT) {
        setCustomFenError(t('tooManyFens', { max: MAX_FEN_COUNT }));
        return;
      }

      const invalidLines: number[] = [];

      lines.forEach((line: string, index: number) => {
        if (!validateFEN(line.trim())) {
          invalidLines.push(index + 1);
        }
      });

      if (invalidLines.length > 0) {
        const lineStr =
          invalidLines.length > 1
            ? t('invalidFenOnLines', { lines: invalidLines.join(', ') })
            : t('invalidFenOnLine', { lines: invalidLines.join(', ') });
        setCustomFenError(lineStr);
      } else {
        setCustomFenError(null);
      }
    } else {
      setCustomFenError(null);
    }
  }, [customFenInput, useCustomFen, t]);

  const generateUrl = useCallback(() => {
    if (!useCustomFen || !customFenInput.trim()) {
      return null;
    }

    const fens = customFenInput
      .trim()
      .split('\n')
      .filter((line: string) => line.trim());

    return generateShareUrl(locale, fens, timeLimit, shuffleProblems);
  }, [useCustomFen, customFenInput, locale, timeLimit, shuffleProblems]);

  const { copyStatus, copy: handleCopyShareLink } = useCopyToClipboard(generateUrl);

  const handleResetConfirm = () => {
    clearSettings();
    localStorage.removeItem(TUTORIAL_SKIPPED_KEY);
    setIsResetConfirmOpen(false);
    router.push(`/${locale}/practice/position-memory/tutorial`);
  };

  const handleStart = () => {
    // Build URL params
    const params = new URLSearchParams();
    params.set('timeLimit', timeLimit.toString());
    params.set('shuffle', shuffleProblems ? '1' : '0');

    if (useCustomFen) {
      const fens = customFenInput
        .trim()
        .split('\n')
        .filter((line: string) => line.trim());

      if (fens.length === 0 || fens.some((fen: string) => !validateFEN(fen.trim()))) {
        return;
      }

      const encoded = encodeFensToBase64(fens);
      params.set('problems', encoded);
      // Use problemCount for custom FEN, capped at the number of FENs
      const effectiveCount = Math.min(problemCount, fens.length);
      params.set('count', effectiveCount.toString());
      params.set('source', 'custom');
    } else {
      // Use all presets
      const presetFens = (presetPositions as PresetPosition[]).map((p) => p.fen);
      const encoded = encodeFensToBase64(presetFens);
      params.set('problems', encoded);
      const effectiveCount = Math.min(problemCount, presetFens.length);
      params.set('count', effectiveCount.toString());
      params.set('source', 'preset');
    }

    // Save current settings to localStorage on start (skip if loaded from share link)
    saveSettings();

    // Navigate to session page
    router.push(
      `/${locale}/practice/position-memory/session?${params.toString()}#position-memory-session`
    );
  };

  return (
    <>
      <div className="mb-8">
        {!isLoaded ? (
          <div className="flex justify-center">
            <div className="w-full max-w-xs">
              <BoardSkeleton />
            </div>
          </div>
        ) : (
          <PositionMemorySettings
            timeLimit={timeLimit}
            problemCount={problemCount}
            shuffleProblems={shuffleProblems}
            useCustomFen={useCustomFen}
            customFenInput={customFenInput}
            customFenError={customFenError}
            copyStatus={copyStatus}
            boardTheme={preferences.boardTheme}
            onTimeLimitChange={(v) => updateSettings({ timeLimit: v })}
            onProblemCountChange={(v) => updateSettings({ problemCount: v })}
            onShuffleChange={(v) => updateSettings({ shuffleProblems: v })}
            onUseCustomFenChange={(v) => updateSettings({ useCustomFen: v })}
            onCustomFenInputChange={(v) => updateSettings({ customFenInput: v })}
            onCopyShareLink={handleCopyShareLink}
          />
        )}

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
          href="/learn/memory/position-memory"
          icon="🧠"
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
