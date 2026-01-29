'use client';

import { useEffect, useState } from 'react';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

import { Button } from '@/app/_components';
import { FaPlay } from 'react-icons/fa';

import { CardLink, SectionTitle } from '@/app/[locale]/_components';
import { ConfirmationModal } from '@/app/[locale]/_components/ConfirmationModal';
import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import type { Locale } from '@/app/[locale]/_lib/types';
import { AnimatedChessBoard } from '@/app/[locale]/practice/_components/AnimatedChessBoard';
import { validateFEN } from '@/app/[locale]/practice/_lib/accuracy';

import type { PresetPosition } from '../_data/positions';
import presetPositions from '../_data/presetPositions.json';
import { TUTORIAL_SKIPPED_KEY } from './TutorialSkipLink';

const MAX_FEN_COUNT = 10;

type Props = {
  locale: Locale;
};

export function FenSetup({ locale }: Props) {
  const t = useTranslations('practice.fen');
  const router = useRouter();
  const { preferences } = useGamePreferences();

  const presetCount = (presetPositions as PresetPosition[]).length;

  // Default values
  const defaultSettings = {
    problemCount: presetCount,
    shuffleProblems: true,
    useCustomFen: false,
    customFenInput: '',
  };

  const [problemCount, setProblemCount] = useState(defaultSettings.problemCount);
  const [shuffleProblems, setShuffleProblems] = useState(defaultSettings.shuffleProblems);
  const [useCustomFen, setUseCustomFen] = useState(defaultSettings.useCustomFen);
  const [customFenInput, setCustomFenInput] = useState(defaultSettings.customFenInput);
  const [customFenError, setCustomFenError] = useState<string | null>(null);
  const [hasLoadedSettings, setHasLoadedSettings] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [previewPreset, setPreviewPreset] = useState<PresetPosition | null>(null);

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('fenPracticeSettings');
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        setProblemCount(settings.problemCount ?? defaultSettings.problemCount);
        setShuffleProblems(settings.shuffleProblems ?? defaultSettings.shuffleProblems);
        setUseCustomFen(settings.useCustomFen ?? defaultSettings.useCustomFen);
        setCustomFenInput(settings.customFenInput ?? defaultSettings.customFenInput);
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
      useCustomFen,
      customFenInput,
    };
    localStorage.setItem('fenPracticeSettings', JSON.stringify(settings));
  }, [problemCount, shuffleProblems, useCustomFen, customFenInput, hasLoadedSettings]);

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

      // Encode FENs to base64
      const encoded = btoa(fens.join('\n'));
      params.set('problems', encoded);
      const effectiveCount = Math.min(problemCount, fens.length);
      params.set('count', effectiveCount.toString());
      params.set('source', 'custom');
    } else {
      // Use all presets
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
    <div className="max-w-4xl mx-auto">
      <div className="bg-card rounded-2xl p-6 shadow-sm border border-border mb-8">
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
                    ? 'bg-card text-foreground shadow-sm'
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
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t('enterFen')}
              </button>
            </div>
          </div>

          {/* Preset Problems List */}
          {!useCustomFen && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                {t('presetDescription')}
              </label>
              <div className="space-y-2">
                {(presetPositions as PresetPosition[]).map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() =>
                      setPreviewPreset(previewPreset?.id === preset.id ? null : preset)
                    }
                    className={`w-full p-3 text-left rounded-lg border transition-colors ${
                      previewPreset?.id === preset.id
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50 hover:bg-secondary/50'
                    }`}
                  >
                    <span className="font-medium">{preset.title}</span>
                  </button>
                ))}
              </div>

              {/* Preview */}
              {previewPreset && (
                <div className="mt-4">
                  <div className="max-w-xs mx-auto">
                    <AnimatedChessBoard
                      initialFen={previewPreset.fen}
                      showCoordinates={true}
                      flipped={previewPreset.fen.split(' ')[1] === 'b'}
                      boardTheme={preferences.boardTheme}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Problem Count (for preset mode) */}
          {!useCustomFen && (
            <div>
              <label
                htmlFor="problemCount"
                className="block text-sm font-medium text-foreground mb-2"
              >
                {t('problemCount')}: {Math.min(problemCount, presetCount)}{' '}
                {Math.min(problemCount, presetCount) > 1 ? t('problems') : ''}
              </label>
              <input
                id="problemCount"
                type="range"
                min="1"
                max={presetCount}
                step="1"
                value={Math.min(problemCount, presetCount)}
                onChange={(e) => setProblemCount(parseInt(e.target.value))}
                className="w-full h-2 bg-secondary rounded-md appearance-none cursor-pointer accent-foreground"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>1</span>
                <span>{presetCount}</span>
              </div>
            </div>
          )}

          {/* Shuffle Problems (for preset mode) */}
          {!useCustomFen && problemCount > 1 && (
            <div className="flex items-center justify-end gap-3">
              <label htmlFor="shuffle" className="text-sm text-muted-foreground">
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

          {/* Custom FEN Input */}
          {useCustomFen && (
            <div>
              <label htmlFor="customFenInput" className="block text-sm text-foreground mb-2">
                {t('customFenDescription')}
              </label>
              <textarea
                id="customFenInput"
                value={customFenInput}
                onChange={(e) => setCustomFenInput(e.target.value)}
                placeholder={t('customFenPlaceholder')}
                className="w-full h-32 px-3 py-2 border border-border rounded-md bg-background text-foreground font-mono text-sm focus:outline-none focus:ring-2 focus:ring-foreground resize-none"
                spellCheck="false"
              />
              {customFenError && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400">{customFenError}</p>
              )}
            </div>
          )}

          {/* Problem Count (for custom FEN mode) */}
          {(() => {
            if (!useCustomFen) return null;
            const customFenCount = customFenInput
              .trim()
              .split('\n')
              .filter((line) => line.trim()).length;
            if (customFenCount < 2) return null;
            return (
              <div>
                <label
                  htmlFor="problemCountCustom"
                  className="block text-sm font-medium text-foreground mb-2"
                >
                  {t('problemCount')}: {Math.min(problemCount, customFenCount)}{' '}
                  {Math.min(problemCount, customFenCount) > 1 ? t('problems') : ''}
                </label>
                <input
                  id="problemCountCustom"
                  type="range"
                  min="1"
                  max={customFenCount}
                  step="1"
                  value={Math.min(problemCount, customFenCount)}
                  onChange={(e) => setProblemCount(parseInt(e.target.value))}
                  className="w-full h-2 bg-secondary rounded-md appearance-none cursor-pointer accent-foreground"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>1</span>
                  <span>{customFenCount}</span>
                </div>
              </div>
            );
          })()}

          {/* Shuffle Problems (for custom FEN mode) */}
          {useCustomFen &&
            customFenInput
              .trim()
              .split('\n')
              .filter((line) => line.trim()).length > 1 && (
              <div className="flex items-center justify-end gap-3">
                <label htmlFor="shuffleCustom" className="text-sm text-muted-foreground">
                  {t('shuffle')}
                </label>
                <button
                  id="shuffleCustom"
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

      <div className="mt-8 space-y-4">
        <SectionTitle>{t('requiredKnowledge')}</SectionTitle>
        <CardLink
          href="/learn/fen-notation"
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
    </div>
  );
}
