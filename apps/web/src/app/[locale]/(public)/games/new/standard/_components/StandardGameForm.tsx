'use client';

import { useState } from 'react';

import { useRouter, useSearchParams } from 'next/navigation';

import { Button } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import type { Side } from '@blindfold-chess/types';

import { engineConfigToUrlParams } from '@/lib/engines';
import { MAIA_CHARGE_PARAM } from '@/lib/games/maia-charge-param';
import { MAIA_GAME_POINT_COST } from '@/lib/points/constants';
import type { MaiaEngineAccess } from '@/lib/users/can-use-maia';

import { ColorSelector } from '@/app/[locale]/(public)/games/new/_components/ColorSelector';
import { EngineSelector } from '@/app/[locale]/(public)/games/new/_components/EngineSelector';
import { GameLaunchModals } from '@/app/[locale]/(public)/games/new/_components/GameLaunchModals';
import { SkillLevelSelector } from '@/app/[locale]/(public)/games/new/_components/SkillLevelSelector';
import { useEngineSelection } from '@/app/[locale]/(public)/games/new/_hooks/use-engine-selection';
import { useLocalGameSettings } from '@/app/[locale]/(public)/games/new/_hooks/use-local-game-settings';
import { useMaiaGameLaunch } from '@/app/[locale]/(public)/games/new/_hooks/use-maia-game-launch';
import {
  deriveMaiaCardMode,
  initialEngineKind,
} from '@/app/[locale]/(public)/games/new/_lib/maia-launch';
import { CollapsibleGameSettings } from '@/app/[locale]/(public)/preferences/_components/CollapsibleGameSettings';
import { SectionTitle } from '@/app/[locale]/_components/SectionTitle';
import type { Locale } from '@/app/[locale]/_lib/types';

type Props = {
  locale: Locale;
  /**
   * Server-side resolved Maia access (the viewer's level and spendable
   * coin balance). Drives the engine selector's Maia card and whether a
   * game start charges a coin.
   */
  maiaAccess: MaiaEngineAccess;
};

export function StandardGameForm({ locale, maiaAccess }: Props) {
  const t = useTranslations('newGame');
  const router = useRouter();
  const [color, setColor] = useState<Side>('white');

  const searchParams = useSearchParams();
  const maiaCardMode = deriveMaiaCardMode(maiaAccess, MAIA_GAME_POINT_COST);
  // `?engine=maia` (e.g. the Maia spend card on /mypage/coins) preselects
  // Maia — read once as the initial value, not synced: after the first
  // render the selection belongs to the user. See `initialEngineKind` for
  // why a locked card overrides the param.
  const {
    engine: engineKind,
    setEngine: setEngineKind,
    skillLevel: stockfishLevel,
    setSkillLevel: setStockfishLevel,
    maiaRating,
    setMaiaRating,
    engineConfig,
  } = useEngineSelection({
    initialEngine: () => initialEngineKind(searchParams.get('engine'), maiaCardMode),
  });

  const { localSettings, handleSettingsChange } = useLocalGameSettings();

  /**
   * Push the user into the play route with the selected settings. Passed
   * to `useMaiaGameLaunch`, which calls it only after the large-download
   * consent and the per-game Maia point charge have both succeeded.
   */
  const navigateToGame = (maiaChargeId: string | null) => {
    const params = new URLSearchParams({
      color,
      gamePrefs: JSON.stringify(localSettings),
      ...engineConfigToUrlParams(engineConfig),
    });
    if (maiaChargeId) params.set(MAIA_CHARGE_PARAM, maiaChargeId);
    router.push(`/${locale}/games/play?${params.toString()}`);
  };

  const launch = useMaiaGameLaunch({ navigateToGame, maiaCardMode });

  return (
    <div className="space-y-6">
      <ColorSelector value={color} onChange={setColor} />
      <EngineSelector
        value={engineKind}
        onChange={setEngineKind}
        maiaCardMode={maiaCardMode}
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

      <SectionTitle>{t('settings')}</SectionTitle>
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

      <GameLaunchModals launch={launch} maiaAccess={maiaAccess} locale={locale} />
    </div>
  );
}
