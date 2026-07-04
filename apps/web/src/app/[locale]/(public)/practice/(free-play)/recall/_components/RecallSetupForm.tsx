'use client';

import { type KeyboardEvent, useCallback, useEffect, useId, useState } from 'react';

import { useRouter } from 'next/navigation';

import { Button, TextInput } from '@/app/_components';
import { useSafeLocale as useLocale } from '@/i18n/use-safe-locale';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { getPgnHeaders, getPgnHistory } from '@blindfold-chess/features/chess-core';
import type { Side } from '@blindfold-chess/types';

import { ColorSelector } from '@/app/[locale]/(public)/games/new/_components/ColorSelector';
import { parsePgnWithFen, validatePgn } from '@/app/[locale]/(public)/games/play/_lib/pgn-parser';
import { PgnInput } from '@/app/[locale]/_components/PgnInput';
import { SectionTitle } from '@/app/[locale]/_components/SectionTitle';

import { importLichessGame } from '../_actions/importLichessGame';

type InputMode = 'manual' | 'lichess';

/**
 * Mirrors `topics/_components/AttachmentModal.tsx`'s tab list — same
 * `role="tab"` / `border-b-2` treatment — so the two attachment-style
 * switchers in the app look and behave the same way.
 */
const INPUT_MODE_TABS: readonly InputMode[] = ['manual', 'lichess'];

/**
 * Standalone entry point for the recall review: paste any PGN (your own
 * game, someone else's, an opening line) and replay it from memory — no
 * associated saved game required. Mirrors `games/new/pgn/_components/PgnGameForm.tsx`'s
 * paste → derive color → navigate flow, minus the engine/skill-level fields
 * that flow needs and this one doesn't.
 */
export function RecallSetupForm() {
  const t = useTranslations('recall');
  const router = useRouter();
  const locale = useLocale();
  const tabIdPrefix = useId();

  const [pgn, setPgn] = useState('');
  const [color, setColor] = useState<Side>('white');
  const [colorManuallySet, setColorManuallySet] = useState(false);

  const [inputMode, setInputMode] = useState<InputMode>('manual');
  const [lichessUrl, setLichessUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  // Auto-derive color from the pasted PGN (whoever moves next), unless the
  // user has explicitly overridden it.
  useEffect(() => {
    if (colorManuallySet) return;
    if (!pgn.trim() || !validatePgn(pgn)) return;

    try {
      const history = getPgnHistory(pgn, { verbose: true }) as { color: string }[];
      if (history.length > 0) {
        const lastMoveEntry = history[history.length - 1];
        setColor(lastMoveEntry.color === 'w' ? 'black' : 'white');
      } else {
        const turnFromFen = getPgnHeaders(pgn).FEN?.split(' ')[1];
        if (turnFromFen) setColor(turnFromFen === 'w' ? 'white' : 'black');
      }
    } catch {
      // Keep the current selection if the PGN can't be parsed yet.
    }
  }, [pgn, colorManuallySet]);

  const handleColorChange = useCallback((next: Side) => {
    setColor(next);
    setColorManuallySet(true);
  }, []);

  const handleImportLichess = async () => {
    if (!lichessUrl.trim() || isImporting) return;
    setIsImporting(true);
    setImportError(null);
    try {
      const result = await importLichessGame(lichessUrl.trim());
      if (!result.ok) {
        setImportError(result.error);
        return;
      }
      // Re-derive color from the freshly imported PGN even if the user had
      // manually overridden it for a previous (unrelated) paste.
      setColorManuallySet(false);
      setPgn(result.pgn);
      setLichessUrl('');
      // Switch back to the manual tab so the user sees (and can tweak) the
      // imported PGN before starting, instead of it landing invisibly behind
      // the still-active Lichess tab.
      setInputMode('manual');
    } finally {
      setIsImporting(false);
    }
  };

  // Roving tab navigation per W3C ARIA APG (mirrors AttachmentModal's
  // handleTabKeyDown).
  const handleTabKeyDown = (e: KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const next = (currentIndex - 1 + INPUT_MODE_TABS.length) % INPUT_MODE_TABS.length;
      setInputMode(INPUT_MODE_TABS[next]);
      return;
    }
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const next = (currentIndex + 1) % INPUT_MODE_TABS.length;
      setInputMode(INPUT_MODE_TABS[next]);
      return;
    }
    if (e.key === 'Home') {
      e.preventDefault();
      setInputMode(INPUT_MODE_TABS[0]);
      return;
    }
    if (e.key === 'End') {
      e.preventDefault();
      setInputMode(INPUT_MODE_TABS[INPUT_MODE_TABS.length - 1]);
    }
  };

  const isStartDisabled = !pgn.trim() || !validatePgn(pgn);

  const handleStart = () => {
    const { moves, startingFen } = parsePgnWithFen(pgn);
    const params = new URLSearchParams({ color });
    params.set('moves', JSON.stringify(moves));
    if (startingFen) params.set('fen', startingFen);
    router.push(`/${locale}/practice/recall?${params.toString()}`);
  };

  return (
    <div className="space-y-4">
      <div data-tour-id="recall-setup-pgn">
        <SectionTitle>{t('setup.pgnLabel')}</SectionTitle>

        {/* Tab list */}
        <div
          role="tablist"
          aria-label={t('setup.pgnLabel')}
          className="mt-3 flex gap-1 border-b border-border"
        >
          {INPUT_MODE_TABS.map((mode, index) => {
            const isActive = inputMode === mode;
            const tabId = `${tabIdPrefix}-tab-${mode}`;
            const panelId = `${tabIdPrefix}-panel-${mode}`;
            return (
              <button
                key={mode}
                type="button"
                role="tab"
                id={tabId}
                aria-selected={isActive}
                aria-controls={panelId}
                tabIndex={isActive ? 0 : -1}
                onClick={() => setInputMode(mode)}
                onKeyDown={(e) => handleTabKeyDown(e, index)}
                className={`px-3 py-2 text-sm border-b-2 -mb-px ${
                  isActive
                    ? 'border-primary text-foreground font-medium'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {t(`setup.inputMode.${mode}`)}
              </button>
            );
          })}
        </div>

        {/* Tab panels */}
        <div className="mt-3">
          <div
            role="tabpanel"
            id={`${tabIdPrefix}-panel-manual`}
            aria-labelledby={`${tabIdPrefix}-tab-manual`}
            hidden={inputMode !== 'manual'}
          >
            <PgnInput value={pgn} onChange={setPgn} />
          </div>
          <div
            role="tabpanel"
            id={`${tabIdPrefix}-panel-lichess`}
            aria-labelledby={`${tabIdPrefix}-tab-lichess`}
            hidden={inputMode !== 'lichess'}
          >
            <div className="space-y-2">
              <div className="flex gap-2">
                <TextInput
                  type="url"
                  value={lichessUrl}
                  onChange={(e) => setLichessUrl(e.target.value)}
                  placeholder={t('setup.lichessImport.placeholder')}
                  className="flex-1"
                />
                <Button
                  onClick={handleImportLichess}
                  disabled={!lichessUrl.trim() || isImporting}
                  loading={isImporting}
                  variant="secondary"
                >
                  {t('setup.lichessImport.button')}
                </Button>
              </div>
              {importError && (
                <p className="text-sm text-destructive">
                  {t(`setup.lichessImport.errors.${importError}`)}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
      <div data-tour-id="recall-setup-color">
        <ColorSelector value={color} onChange={handleColorChange} />
      </div>
      <Button
        onClick={handleStart}
        disabled={isStartDisabled}
        variant="primary"
        size="lg"
        className="w-full"
      >
        {t('setup.startButton')}
      </Button>
    </div>
  );
}
