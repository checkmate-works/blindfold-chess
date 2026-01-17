'use client';

import { useState } from 'react';

import { useTranslations } from 'next-intl';

import { FaInfoCircle, FaLink } from 'react-icons/fa';

import type { BoardTheme } from '@/lib/boardThemes';

import { Modal } from '@/app/[locale]/_components/Modal';
import { AnimatedChessBoard } from '@/app/[locale]/practice/_components/AnimatedChessBoard';

import type { PresetPosition } from '../_data/positions';
import presetPositions from '../_data/presetPositions.json';

type Props = {
  timeLimit: number;
  problemCount: number;
  shuffleProblems: boolean;
  useCustomFen: boolean;
  customFenInput: string;
  customFenError: string | null;
  copyStatus: 'idle' | 'success' | 'error' | 'too_long';
  boardTheme: BoardTheme;
  onTimeLimitChange: (value: number) => void;
  onProblemCountChange: (value: number) => void;
  onShuffleChange: (value: boolean) => void;
  onUseCustomFenChange: (value: boolean) => void;
  onCustomFenInputChange: (value: string) => void;
  onCopyShareLink: () => void;
};

const PRESET_COUNT = (presetPositions as PresetPosition[]).length;

export function PositionMemorySettings({
  timeLimit,
  problemCount,
  shuffleProblems,
  useCustomFen,
  customFenInput,
  customFenError,
  copyStatus,
  boardTheme,
  onTimeLimitChange,
  onProblemCountChange,
  onShuffleChange,
  onUseCustomFenChange,
  onCustomFenInputChange,
  onCopyShareLink,
}: Props) {
  const t = useTranslations('practice.positionMemory');
  const [previewPreset, setPreviewPreset] = useState<PresetPosition | null>(null);
  const [isShareLinkHelpOpen, setIsShareLinkHelpOpen] = useState(false);

  return (
    <div className="space-y-6">
      {/* Problem Source */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          {t('problemSource')}
        </label>
        <div className="flex rounded-lg bg-secondary p-1">
          <button
            type="button"
            onClick={() => onUseCustomFenChange(false)}
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
            onClick={() => onUseCustomFenChange(true)}
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
                onClick={() => setPreviewPreset(previewPreset?.id === preset.id ? null : preset)}
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
                  boardTheme={boardTheme}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Problem Count (for preset mode) */}
      {!useCustomFen && (
        <div>
          <label htmlFor="problemCount" className="block text-sm font-medium text-foreground mb-2">
            {t('problemCount')}: {Math.min(problemCount, PRESET_COUNT)}{' '}
            {Math.min(problemCount, PRESET_COUNT) > 1 ? t('problems') : ''}
          </label>
          <input
            id="problemCount"
            type="range"
            min="1"
            max={PRESET_COUNT}
            step="1"
            value={Math.min(problemCount, PRESET_COUNT)}
            onChange={(e) => onProblemCountChange(parseInt(e.target.value))}
            className="w-full h-2 bg-secondary rounded-md appearance-none cursor-pointer accent-foreground"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>1</span>
            <span>{PRESET_COUNT}</span>
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
            onClick={() => onShuffleChange(!shuffleProblems)}
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

      {/* Time Limit (for preset mode) */}
      {!useCustomFen && (
        <div>
          <label htmlFor="timeLimit" className="block text-sm font-medium text-foreground mb-2">
            {t('timeLimit')}: {timeLimit} {t('seconds')}
          </label>
          <input
            id="timeLimit"
            type="range"
            min="5"
            max="60"
            step="5"
            value={timeLimit}
            onChange={(e) => onTimeLimitChange(parseInt(e.target.value))}
            className="w-full h-2 bg-secondary rounded-md appearance-none cursor-pointer accent-foreground"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>{t('fiveSeconds')}</span>
            <span>{t('oneMinute')}</span>
          </div>
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
            onChange={(e) => onCustomFenInputChange(e.target.value)}
            placeholder={t('customFenPlaceholder')}
            className="w-full h-32 px-3 py-2 border border-border rounded-md bg-background text-foreground font-mono text-sm focus:outline-none focus:ring-2 focus:ring-foreground resize-none"
            spellCheck="false"
          />
          {customFenError && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">{customFenError}</p>
          )}

          {/* Share Link Button */}
          {customFenInput.trim() && !customFenError && (
            <div className="mt-3 flex items-center justify-end gap-2">
              <button
                onClick={onCopyShareLink}
                className="flex items-center justify-center gap-2 px-3 py-1.5 bg-secondary text-foreground text-sm rounded-md hover:bg-secondary/80 transition-colors"
              >
                <FaLink className="text-xs" />
                <span>{t('copyShareLink')}</span>
              </button>
              <button
                type="button"
                onClick={() => setIsShareLinkHelpOpen(true)}
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Show share link information"
              >
                <FaInfoCircle className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Copy Status Messages */}
          {copyStatus === 'success' && (
            <p className="mt-2 text-sm text-green-600 dark:text-green-400">{t('linkCopied')}</p>
          )}
          {copyStatus === 'error' && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">{t('copyFailed')}</p>
          )}
          {copyStatus === 'too_long' && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">{t('urlTooLong')}</p>
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
              onChange={(e) => onProblemCountChange(parseInt(e.target.value))}
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
              onClick={() => onShuffleChange(!shuffleProblems)}
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

      {/* Time Limit (for custom FEN mode) */}
      {useCustomFen && (
        <div>
          <label
            htmlFor="timeLimitCustom"
            className="block text-sm font-medium text-foreground mb-2"
          >
            {t('timeLimit')}: {timeLimit} {t('seconds')}
          </label>
          <input
            id="timeLimitCustom"
            type="range"
            min="5"
            max="60"
            step="5"
            value={timeLimit}
            onChange={(e) => onTimeLimitChange(parseInt(e.target.value))}
            className="w-full h-2 bg-secondary rounded-md appearance-none cursor-pointer accent-foreground"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>{t('fiveSeconds')}</span>
            <span>{t('oneMinute')}</span>
          </div>
        </div>
      )}

      {/* Share Link Help Modal */}
      <Modal
        isOpen={isShareLinkHelpOpen}
        title={t('copyShareLink')}
        onClose={() => setIsShareLinkHelpOpen(false)}
        maxWidth="max-w-md"
      >
        <p className="text-foreground">{t('shareLinkHelp')}</p>
      </Modal>
    </div>
  );
}
