'use client';

import { useState } from 'react';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FaInfoCircle, FaLink } from 'react-icons/fa';

import { PgnInput } from '@/app/[locale]/_components';
import { Modal } from '@/app/[locale]/_components/Modal';
import { UI_TIMEOUTS } from '@/app/[locale]/_constants/ui-timeouts';
import type { Locale } from '@/app/[locale]/_lib/types';

import { generateShareUrl } from '../_lib/share';

type CopyStatus = 'idle' | 'success' | 'error' | 'too_long';

type Props = {
  locale: Locale;
  fen: string;
  pgn: string;
  error: string | null;
  onFenChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPgnChange: (value: string) => void;
};

export function CustomMoveSequenceInput({
  locale,
  fen,
  pgn,
  error,
  onFenChange,
  onPgnChange,
}: Props) {
  const t = useTranslations('practice.moveSequence');
  const [copyStatus, setCopyStatus] = useState<CopyStatus>('idle');
  const [isShareLinkHelpOpen, setIsShareLinkHelpOpen] = useState(false);

  const canShare = fen.trim() && pgn.trim();

  const handleCopyShareLink = () => {
    if (!fen.trim() || !pgn.trim()) {
      return;
    }

    const { url, isTooLong } = generateShareUrl(locale, fen.trim(), pgn.trim());

    if (isTooLong) {
      setCopyStatus('too_long');
      setTimeout(() => setCopyStatus('idle'), UI_TIMEOUTS.COPY_SUCCESS_DURATION);
      return;
    }

    navigator.clipboard
      .writeText(url)
      .then(() => {
        setCopyStatus('success');
        setTimeout(() => setCopyStatus('idle'), UI_TIMEOUTS.COPY_SUCCESS_DURATION);
      })
      .catch(() => {
        setCopyStatus('error');
        setTimeout(() => setCopyStatus('idle'), UI_TIMEOUTS.COPY_SUCCESS_DURATION);
      });
  };

  return (
    <>
      {/* FEN Input */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">{t('fenLabel')}</label>
        <input
          type="text"
          value={fen}
          onChange={onFenChange}
          placeholder={t('fenPlaceholder')}
          className="w-full px-4 py-3 border border-border rounded-lg bg-background font-mono text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
        />
        <p className="mt-2 text-xs text-muted-foreground">{t('fenHint')}</p>
      </div>

      {/* PGN Input */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">{t('pgnLabel')}</label>
        <PgnInput
          value={pgn}
          onChange={onPgnChange}
          placeholder={t('pgnPlaceholder')}
          heightClass="h-32"
          showValidation={false}
        />

        {/* Validation Error */}
        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}

        {/* Share Link Button */}
        {canShare && (
          <div className="mt-3 flex items-center justify-end gap-2">
            <button
              onClick={handleCopyShareLink}
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
