'use client';

import { useEffect, useState } from 'react';

import { useTranslations } from 'next-intl';

import { Button } from '@/app/_components';
import { FaLink } from 'react-icons/fa';

import { PgnInput } from '@/app/[locale]/_components';
import type { Locale } from '@/app/[locale]/_lib/types';

import { parseMoveSequence } from '../_lib/pgn-parser';
import { generateShareUrl } from '../_lib/share';
import { loadSettings, saveSettings } from '../_lib/storage';
import type { MoveSequenceData } from '../_lib/types';

type CopyStatus = 'idle' | 'success' | 'error' | 'too_long';

type Props = {
  locale: Locale;
  urlFen: string | null;
  urlPgn: string | null;
  urlError: string | null;
  onStart: (data: MoveSequenceData) => void;
};

export function MoveSequenceSetup({ locale, urlFen, urlPgn, urlError, onStart }: Props) {
  const t = useTranslations('practice.moveSequence');

  const [fen, setFen] = useState('');
  const [pgn, setPgn] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [copyStatus, setCopyStatus] = useState<CopyStatus>('idle');

  // Load settings from localStorage or URL on mount
  useEffect(() => {
    // URL params take priority
    if (urlFen !== null && urlPgn !== null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFen(urlFen);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPgn(urlPgn);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHasLoaded(true);
      return;
    }

    // Otherwise, load from localStorage
    const settings = loadSettings();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFen(settings.fen);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPgn(settings.pgn);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHasLoaded(true);
  }, [urlFen, urlPgn]);

  // Show URL error if present
  useEffect(() => {
    if (urlError) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setError(t(urlError as 'url_too_long' | 'invalid_data' | 'invalid_fen'));
    }
  }, [urlError, t]);

  // Save settings when they change
  useEffect(() => {
    if (!hasLoaded) return;
    saveSettings({ fen, pgn });
  }, [fen, pgn, hasLoaded]);

  const handleStart = () => {
    setError(null);

    if (!fen.trim()) {
      setError(t('fenRequired'));
      return;
    }

    if (!pgn.trim()) {
      setError(t('pgnRequired'));
      return;
    }

    const result = parseMoveSequence(fen.trim(), pgn.trim());

    if (!result.success) {
      setError(result.error);
      return;
    }

    onStart(result.data);
  };

  const handleFenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFen(e.target.value);
    if (error) setError(null);
  };

  const handlePgnChange = (value: string) => {
    setPgn(value);
    if (error) setError(null);
  };

  const handleCopyShareLink = () => {
    if (!fen.trim() || !pgn.trim()) {
      return;
    }

    const { url, isTooLong } = generateShareUrl(locale, fen.trim(), pgn.trim());

    if (isTooLong) {
      setCopyStatus('too_long');
      setTimeout(() => setCopyStatus('idle'), 3000);
      return;
    }

    navigator.clipboard
      .writeText(url)
      .then(() => {
        setCopyStatus('success');
        setTimeout(() => setCopyStatus('idle'), 3000);
      })
      .catch(() => {
        setCopyStatus('error');
        setTimeout(() => setCopyStatus('idle'), 3000);
      });
  };

  const canShare = fen.trim() && pgn.trim();

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
        <div className="space-y-6">
          {/* FEN Input */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              {t('fenLabel')}
            </label>
            <input
              type="text"
              value={fen}
              onChange={handleFenChange}
              placeholder={t('fenPlaceholder')}
              className="w-full px-4 py-3 border border-border rounded-lg bg-background font-mono text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
            />
            <p className="mt-2 text-xs text-muted-foreground">{t('fenHint')}</p>
          </div>

          {/* PGN Input */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              {t('pgnLabel')}
            </label>
            <PgnInput
              value={pgn}
              onChange={handlePgnChange}
              placeholder={t('pgnPlaceholder')}
              heightClass="h-32"
              showValidation={false}
            />

            {/* Share Link Button */}
            {canShare && (
              <div className="mt-3 flex justify-end">
                <button
                  onClick={handleCopyShareLink}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-secondary text-foreground rounded-lg hover:bg-secondary/80 transition-colors"
                >
                  <FaLink />
                  <span>{t('copyShareLink')}</span>
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

          {/* Error Message */}
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <p className="text-destructive text-sm">{error}</p>
            </div>
          )}

          {/* Start Button */}
          <Button onClick={handleStart} variant="primary" size="lg" className="w-full">
            {t('start')}
          </Button>
        </div>
      </div>
    </div>
  );
}
