'use client';

import { useEffect, useState } from 'react';

import { useTranslations } from 'next-intl';

import { Button } from '@/app/_components';

import { parseMoveSequence } from '../_lib/pgn-parser';
import { loadSettings, saveSettings } from '../_lib/storage';
import type { MoveSequenceData } from '../_lib/types';

type Props = {
  onStart: (data: MoveSequenceData) => void;
};

export function MoveSequenceSetup({ onStart }: Props) {
  const t = useTranslations('practice.moveSequence');

  const [fen, setFen] = useState('');
  const [pgn, setPgn] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    const settings = loadSettings();
    setFen(settings.fen);
    setPgn(settings.pgn);
    setHasLoaded(true);
  }, []);

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

  const handlePgnChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPgn(e.target.value);
    if (error) setError(null);
  };

  return (
    <div className="space-y-6">
      {/* FEN Input */}
      <div className="bg-card rounded-xl shadow-sm border border-border p-6">
        <label className="block text-sm font-medium text-foreground mb-2">{t('fenLabel')}</label>
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
      <div className="bg-card rounded-xl shadow-sm border border-border p-6">
        <label className="block text-sm font-medium text-foreground mb-2">{t('pgnLabel')}</label>
        <textarea
          value={pgn}
          onChange={handlePgnChange}
          placeholder={t('pgnPlaceholder')}
          rows={4}
          className="w-full px-4 py-3 border border-border rounded-lg bg-background font-mono text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20 resize-none"
        />
        <p className="mt-2 text-xs text-muted-foreground">{t('pgnHint')}</p>
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
  );
}
