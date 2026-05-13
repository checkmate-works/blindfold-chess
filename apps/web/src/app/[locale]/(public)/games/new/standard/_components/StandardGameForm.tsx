'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { Button } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import type { Side } from '@blindfold-chess/types';

import { DEFAULT_ENGINE, type EngineKind } from '@/lib/engines';
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
  const [skillLevel, setSkillLevel] = useState<SkillLevel>(5);
  const [engine, setEngine] = useState<EngineKind>(DEFAULT_ENGINE);
  const [isLoading, setIsLoading] = useState(false);
  const [consentDialogOpen, setConsentDialogOpen] = useState(false);

  const { localSettings, handleSettingsChange } = useLocalGameSettings();

  /**
   * Push the user into the play route with the selected settings. Split
   * out from `handleStartGame` so the consent dialog's "Continue" path
   * can reuse it after the user has acknowledged the download.
   */
  const navigateToGame = () => {
    const params: Record<string, string> = {
      color,
      skillLevel: skillLevel.toString(),
      gamePrefs: JSON.stringify(localSettings),
    };
    // Only include `engine` when it differs from the default — keeps
    // share-links short for the common Stockfish case.
    if (engine !== DEFAULT_ENGINE) params.engine = engine;
    const searchParams = new URLSearchParams(params);
    router.push(`/${locale}/games/play?${searchParams.toString()}`);
  };

  const handleStartGame = () => {
    setIsLoading(true);
    // Maia is the only engine that triggers a multi-megabyte download.
    // Show the consent dialog on metered / slow links; Wi-Fi users go
    // straight through.
    if (engine === 'maia' && shouldWarnBeforeLargeDownload()) {
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
      <EngineSelector value={engine} onChange={setEngine} maiaUnlocked={maiaUnlocked} />
      <SkillLevelSelector value={skillLevel} onChange={setSkillLevel} engine={engine} />

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
