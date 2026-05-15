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
import { MAIA_GAME_POINT_COST } from '@/lib/points/constants';
import type { SkillLevel } from '@/lib/types';
import type { MaiaEngineAccess } from '@/lib/users/can-use-maia';

import { CollapsibleGameSettings } from '@/app/[locale]/(public)/games/new/_components/CollapsibleGameSettings';
import { ColorSelector } from '@/app/[locale]/(public)/games/new/_components/ColorSelector';
import { EngineSelector } from '@/app/[locale]/(public)/games/new/_components/EngineSelector';
import { LargeDownloadConsentDialog } from '@/app/[locale]/(public)/games/new/_components/LargeDownloadConsentDialog';
import { MaiaPointInfoModal } from '@/app/[locale]/(public)/games/new/_components/MaiaPointInfoModal';
import { SkillLevelSelector } from '@/app/[locale]/(public)/games/new/_components/SkillLevelSelector';
import { useLocalGameSettings } from '@/app/[locale]/(public)/games/new/_hooks/use-local-game-settings';
import { useMaiaGameLaunch } from '@/app/[locale]/(public)/games/new/_hooks/use-maia-game-launch';
import { deriveMaiaCardMode } from '@/app/[locale]/(public)/games/new/_lib/maia-launch';
import { SectionTitle } from '@/app/[locale]/_components/SectionTitle';
import type { Locale } from '@/app/[locale]/_lib/types';

type Props = {
  locale: Locale;
  /**
   * Server-side resolved Maia access (subscription / grant exemption plus
   * the viewer's spendable point balance). Drives the engine selector's
   * Maia card and the per-game point charge.
   */
  maiaAccess: MaiaEngineAccess;
};

/** Approximate compressed download size of the Maia 3 ONNX model. */
const MAIA_MODEL_SIZE_LABEL = '46 MB';

export function StandardGameForm({ locale, maiaAccess }: Props) {
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

  const { localSettings, handleSettingsChange } = useLocalGameSettings();

  const engineConfig: EngineConfig =
    engineKind === 'maia'
      ? { kind: 'maia', rating: maiaRating }
      : { kind: 'stockfish', skillLevel: stockfishLevel };

  /**
   * Push the user into the play route with the selected settings. Passed
   * to `useMaiaGameLaunch`, which calls it only after the large-download
   * consent and the per-game Maia point charge have both succeeded.
   */
  const navigateToGame = () => {
    const params = new URLSearchParams({
      color,
      gamePrefs: JSON.stringify(localSettings),
      ...engineConfigToUrlParams(engineConfig),
    });
    router.push(`/${locale}/games/play?${params.toString()}`);
  };

  const launch = useMaiaGameLaunch({ maiaAccess, navigateToGame });

  return (
    <div className="space-y-6">
      <ColorSelector value={color} onChange={setColor} />
      <EngineSelector
        value={engineKind}
        onChange={setEngineKind}
        maiaCardMode={deriveMaiaCardMode(maiaAccess, MAIA_GAME_POINT_COST)}
        maiaCost={MAIA_GAME_POINT_COST}
        onMaiaLockedClick={launch.openPointInfo}
      />
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
        onClick={() => launch.start(engineKind)}
        loading={launch.isLoading}
        variant="primary"
        size="lg"
        className="w-full"
      >
        {t('startGame')}
      </Button>

      <LargeDownloadConsentDialog
        isOpen={launch.consentDialog.isOpen}
        onConfirm={launch.consentDialog.onConfirm}
        onCancel={launch.consentDialog.onCancel}
        sizeLabel={MAIA_MODEL_SIZE_LABEL}
      />
      <MaiaPointInfoModal
        isOpen={launch.pointInfoModal.isOpen}
        onClose={launch.pointInfoModal.onClose}
        cost={MAIA_GAME_POINT_COST}
        spendableBalance={maiaAccess.spendableBalance}
        locale={locale}
      />
    </div>
  );
}
