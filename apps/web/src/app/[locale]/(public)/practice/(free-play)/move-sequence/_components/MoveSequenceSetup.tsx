'use client';

import { Button } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FaInfoCircle, FaPlay } from 'react-icons/fa';

import { BetaNotice, CardLink, SectionTitle } from '@/app/[locale]/_components';
import { ConfirmationModal } from '@/app/[locale]/_components/ConfirmationModal';
import type { Locale } from '@/app/[locale]/_lib/types';

import { useMoveSequenceForm } from '../_hooks/useMoveSequenceForm';
import { AboutFeatureInfoModal } from './AboutFeatureInfoModal';
import { CustomMoveSequenceInput } from './CustomMoveSequenceInput';
import { PresetProblemList } from './PresetProblemList';

type Props = {
  locale: Locale;
  urlFen: string | null;
  urlPgn: string | null;
  urlError: string | null;
};

export function MoveSequenceSetup({ locale, urlFen, urlPgn, urlError }: Props) {
  const t = useTranslations('practice.moveSequence');

  const {
    fen,
    pgn,
    includeOpponentMoves,
    setIncludeOpponentMoves,
    usePreset,
    setUsePreset,
    selectedPresetId,
    setSelectedPresetId,
    error,
    isResetConfirmOpen,
    setIsResetConfirmOpen,
    isAboutFeatureOpen,
    setIsAboutFeatureOpen,
    handleFenChange,
    handlePgnChange,
    handleStart,
    handleResetConfirm,
  } = useMoveSequenceForm({ locale, urlFen, urlPgn, urlError });

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
                    ? 'bg-card text-foreground'
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
                    ? 'bg-card text-foreground'
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
