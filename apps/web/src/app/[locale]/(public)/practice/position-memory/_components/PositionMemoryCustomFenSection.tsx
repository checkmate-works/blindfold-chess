'use client';

import { useState } from 'react';

import { useTranslations } from 'next-intl';

import { FaInfoCircle, FaLink } from 'react-icons/fa';

import { Modal } from '@/app/[locale]/_components/Modal';

type Props = {
  customFenInput: string;
  customFenError: string | null;
  problemCount: number;
  shuffleProblems: boolean;
  timeLimit: number;
  copyStatus: 'idle' | 'success' | 'error' | 'too_long';
  onCustomFenInputChange: (value: string) => void;
  onProblemCountChange: (value: number) => void;
  onShuffleChange: (value: boolean) => void;
  onTimeLimitChange: (value: number) => void;
  onCopyShareLink: () => void;
};

export function PositionMemoryCustomFenSection({
  customFenInput,
  customFenError,
  problemCount,
  shuffleProblems,
  timeLimit,
  copyStatus,
  onCustomFenInputChange,
  onProblemCountChange,
  onShuffleChange,
  onTimeLimitChange,
  onCopyShareLink,
}: Props) {
  const t = useTranslations('practice.positionMemory');
  const [isShareLinkHelpOpen, setIsShareLinkHelpOpen] = useState(false);

  const customFenCount = customFenInput
    .trim()
    .split('\n')
    .filter((line) => line.trim()).length;

  return (
    <>
      {/* Custom FEN Input */}
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
        {customFenError && <p className="mt-2 text-sm text-destructive">{customFenError}</p>}

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
        {copyStatus === 'success' && <p className="mt-2 text-sm text-success">{t('linkCopied')}</p>}
        {copyStatus === 'error' && (
          <p className="mt-2 text-sm text-destructive">{t('copyFailed')}</p>
        )}
        {copyStatus === 'too_long' && (
          <p className="mt-2 text-sm text-destructive">{t('urlTooLong')}</p>
        )}
      </div>

      {/* Problem Count */}
      {customFenCount >= 2 && (
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
      )}

      {/* Shuffle Problems */}
      {customFenCount > 1 && (
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

      {/* Time Limit */}
      <div>
        <label htmlFor="timeLimitCustom" className="block text-sm font-medium text-foreground mb-2">
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

      {/* Share Link Help Modal */}
      <Modal
        isOpen={isShareLinkHelpOpen}
        title={t('copyShareLink')}
        onClose={() => setIsShareLinkHelpOpen(false)}
        maxWidth="max-w-md"
      >
        <p className="text-foreground">{t('shareLinkHelp')}</p>
      </Modal>
    </>
  );
}
