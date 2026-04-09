'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { Button } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FaInfoCircle, FaPlay } from 'react-icons/fa';

import { BetaNotice, CardLink, SectionTitle } from '@/app/[locale]/_components';
import { ConfirmationModal } from '@/app/[locale]/_components/ConfirmationModal';
import type { Locale } from '@/app/[locale]/_lib/types';

import { presetOpenings } from '../_data/presetOpenings';
import { useMoveSequenceSettings } from '../_hooks/use-move-sequence-settings';
import { useMoveSequenceValidation } from '../_hooks/use-move-sequence-validation';
import { encodeMoveSequenceToBase64 } from '../_lib/share';
import { saveSettings } from '../_lib/storage';
import { AboutFeatureInfoModal } from './AboutFeatureInfoModal';
import { CustomMoveSequenceInput } from './CustomMoveSequenceInput';
import { PresetProblemList } from './PresetProblemList';
import { TUTORIAL_SKIPPED_KEY } from './TutorialSkipLink';

type Props = {
  locale: Locale;
  urlFen: string | null;
  urlPgn: string | null;
  urlError: string | null;
};

export function MoveSequenceSetup({ locale, urlFen, urlPgn, urlError }: Props) {
  const t = useTranslations('practice.moveSequence');
  const router = useRouter();

  const [error, setError] = useState<string | null>(null);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(
    presetOpenings[0]?.id ?? null
  );
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isAboutFeatureOpen, setIsAboutFeatureOpen] = useState(false);

  const {
    fen,
    setFen,
    pgn,
    setPgn,
    includeOpponentMoves,
    setIncludeOpponentMoves,
    usePreset,
    setUsePreset,
    clearSettings: clearStoredSettings,
  } = useMoveSequenceSettings({ urlFen, urlPgn, urlError }, setError);

  const { validateInput, runValidation } = useMoveSequenceValidation(setError);

  const handleFenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFen = e.target.value;
    setFen(newFen);
    runValidation(newFen, pgn);
  };

  const handlePgnChange = (value: string) => {
    setPgn(value);
    runValidation(fen, value);
  };

  const handleStart = () => {
    setError(null);

    let startFen: string;
    let startPgn: string;

    if (usePreset) {
      const preset = presetOpenings.find((p) => p.id === selectedPresetId);
      if (!preset) {
        setError('Please select a preset');
        return;
      }
      startFen = preset.fen;
      startPgn = preset.pgn;
    } else {
      if (!fen.trim()) {
        setError(t('fenRequired'));
        return;
      }

      if (!pgn.trim()) {
        setError(t('pgnRequired'));
        return;
      }

      const validationError = validateInput(fen.trim(), pgn.trim());
      if (validationError) {
        setError(validationError);
        return;
      }

      startFen = fen.trim();
      startPgn = pgn.trim();

      saveSettings({ fen: startFen, pgn: startPgn, includeOpponentMoves });
    }

    const params = new URLSearchParams();
    const encoded = encodeMoveSequenceToBase64(startFen, startPgn);
    params.set('data', encoded);
    if (includeOpponentMoves) {
      params.set('includeOpponentMoves', '1');
    }

    router.push(
      `/${locale}/practice/move-sequence/session?${params.toString()}#move-sequence-session`
    );
  };

  const handleResetConfirm = () => {
    clearStoredSettings();
    localStorage.removeItem(TUTORIAL_SKIPPED_KEY);
    setIsResetConfirmOpen(false);
    router.push(`/${locale}/practice/move-sequence/tutorial`);
  };

  return (
    <>
      <div className="mb-8">
        <SectionTitle className="mb-6">
          <span className="inline-flex items-center gap-2">
            {t('title')}
            <button
              type="button"
              onClick={() => setIsAboutFeatureOpen(true)}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Show feature information"
            >
              <FaInfoCircle className="w-4 h-4" />
            </button>
          </span>
        </SectionTitle>

        <BetaNotice className="mb-6">
          <p>{t('betaNotice')}</p>
        </BetaNotice>

        <div className="space-y-6">
          {/* Problem Source Toggle */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              {t('problemSource')}
            </label>
            <div className="flex rounded-lg bg-secondary p-1">
              <button
                type="button"
                onClick={() => setUsePreset(true)}
                className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  usePreset
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t('presetProblems')}
              </button>
              <button
                type="button"
                onClick={() => setUsePreset(false)}
                className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  !usePreset
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t('enterCustom')}
              </button>
            </div>
          </div>

          {/* Preset Problems List */}
          {usePreset && (
            <PresetProblemList
              selectedPresetId={selectedPresetId}
              onSelectPreset={setSelectedPresetId}
            />
          )}

          {/* Custom FEN/PGN Input */}
          {!usePreset && (
            <CustomMoveSequenceInput
              locale={locale}
              fen={fen}
              pgn={pgn}
              error={error}
              onFenChange={handleFenChange}
              onPgnChange={handlePgnChange}
            />
          )}

          {/* Include Opponent Moves Toggle */}
          <div className="flex items-center justify-end gap-3">
            <label htmlFor="includeOpponentMoves" className="text-sm text-muted-foreground">
              {t('includeOpponentMoves')}
            </label>
            <button
              id="includeOpponentMoves"
              type="button"
              role="switch"
              aria-checked={includeOpponentMoves}
              onClick={() => setIncludeOpponentMoves(!includeOpponentMoves)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                includeOpponentMoves ? 'bg-foreground' : 'bg-secondary'
              }`}
            >
              <span className="sr-only">{t('includeOpponentMoves')}</span>
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${
                  includeOpponentMoves ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Start Button */}
          <Button
            onClick={handleStart}
            variant="primary"
            size="lg"
            className="w-full"
            icon={<FaPlay />}
          >
            {t('start')}
          </Button>
        </div>
      </div>

      <div className="mt-8 flex justify-end">
        <Button variant="destructive" onClick={() => setIsResetConfirmOpen(true)}>
          {t('resetSettings')}
        </Button>
      </div>

      <div className="mt-8 space-y-4">
        <SectionTitle>{t('relatedArticles')}</SectionTitle>
        <CardLink
          href="/learn/notation/algebraic-notation"
          icon="🔤"
          title={t('articles.algebraicNotation.title')}
          description={t('articles.algebraicNotation.description')}
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

      <AboutFeatureInfoModal
        isOpen={isAboutFeatureOpen}
        onClose={() => setIsAboutFeatureOpen(false)}
      />
    </>
  );
}
