'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { Button } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { DEFAULT_MAIA_RATING, type MaiaRating } from '@blindfold-chess/features/ai-game/maia';
import type { Side } from '@blindfold-chess/types';

import {
  DEFAULT_ENGINE,
  type EngineConfig,
  type EngineKind,
  engineConfigToUrlParams,
} from '@/lib/engines';
import { shouldWarnBeforeLargeDownload } from '@/lib/network/connection';
import type { SkillLevel } from '@/lib/types';

import { CollapsibleGameSettings } from '@/app/[locale]/(public)/games/new/_components/CollapsibleGameSettings';
import { ColorSelector } from '@/app/[locale]/(public)/games/new/_components/ColorSelector';
import { EngineSelector } from '@/app/[locale]/(public)/games/new/_components/EngineSelector';
import { LargeDownloadConsentDialog } from '@/app/[locale]/(public)/games/new/_components/LargeDownloadConsentDialog';
import { SkillLevelSelector } from '@/app/[locale]/(public)/games/new/_components/SkillLevelSelector';
import { useLocalGameSettings } from '@/app/[locale]/(public)/games/new/_hooks/use-local-game-settings';
import { SectionTitle } from '@/app/[locale]/_components/SectionTitle';
import type { Locale } from '@/app/[locale]/_lib/types';

type Props = {
  locale: Locale;
  /**
   * Server-side computed Maia entitlement (active subscription or
   * `maia_access` grant). Passed through from the page; this component
   * does not perform its own auth check. Defaults to `false` so any
   * accidental client-only render is locked-down.
   */
  maiaUnlocked: boolean;
};

/** Approximate compressed download size of the Maia 3 ONNX model. */
const MAIA_MODEL_SIZE_LABEL = '46 MB';

export function StandardGameForm({ locale, maiaUnlocked }: Props) {
  const t = useTranslations('newGame');
  const router = useRouter();
  const [color, setColor] = useState<Side>('white');
  // Two parallel difficulty slots — Stockfish's 1..20 level and Maia's
  // catalog rating — are kept around so toggling between engines never
  // loses the user's previously-chosen value on either side. They get
  // folded into a single `EngineConfig` at navigation time below.
  const [stockfishLevel, setStockfishLevel] = useState<SkillLevel>(5);
  const [maiaRating, setMaiaRating] = useState<MaiaRating>(DEFAULT_MAIA_RATING);
  const [engineKind, setEngineKind] = useState<EngineKind>(DEFAULT_ENGINE);
  const [isLoading, setIsLoading] = useState(false);
  const [consentDialogOpen, setConsentDialogOpen] = useState(false);

  const { localSettings, handleSettingsChange } = useLocalGameSettings();

  const engineConfig: EngineConfig =
    engineKind === 'maia'
      ? { kind: 'maia', rating: maiaRating }
      : { kind: 'stockfish', skillLevel: stockfishLevel };

  /**
   * Push the user into the play route with the selected settings. Split
   * out from `handleStartGame` so the consent dialog's "Continue" path
   * can reuse it after the user has acknowledged the download.
   */
  const navigateToGame = () => {
    const params = new URLSearchParams({
      color,
      gamePrefs: JSON.stringify(localSettings),
      ...engineConfigToUrlParams(engineConfig),
    });
    router.push(`/${locale}/games/play?${params.toString()}`);
  };

  const handleStartGame = () => {
    setIsLoading(true);
    // Maia is the only engine that triggers a multi-megabyte download.
    // Show the consent dialog on metered / slow links; Wi-Fi users go
    // straight through.
    if (engineKind === 'maia' && shouldWarnBeforeLargeDownload()) {
      setConsentDialogOpen(true);
      return;
    }
    navigateToGame();
  };

  const handleConsentConfirm = () => {
    setConsentDialogOpen(false);
    navigateToGame();
  };

  const handleConsentCancel = () => {
    setConsentDialogOpen(false);
    setIsLoading(false);
  };

  return (
    <div className="space-y-6">
      <ColorSelector value={color} onChange={setColor} />
      <EngineSelector value={engineKind} onChange={setEngineKind} maiaUnlocked={maiaUnlocked} />
      <SkillLevelSelector
        engine={engineKind}
        stockfishLevel={stockfishLevel}
        onStockfishLevelChange={setStockfishLevel}
        maiaRating={maiaRating}
        onMaiaRatingChange={setMaiaRating}
      />

      <SectionTitle>{t('gameSettings')}</SectionTitle>
      <CollapsibleGameSettings settings={localSettings} onSettingsChange={handleSettingsChange} />

      <Button
        onClick={handleStartGame}
        loading={isLoading}
        variant="primary"
        size="lg"
        className="w-full"
      >
        {t('startGame')}
      </Button>

      <LargeDownloadConsentDialog
        isOpen={consentDialogOpen}
        onConfirm={handleConsentConfirm}
        onCancel={handleConsentCancel}
        sizeLabel={MAIA_MODEL_SIZE_LABEL}
      />
    </div>
  );
}
