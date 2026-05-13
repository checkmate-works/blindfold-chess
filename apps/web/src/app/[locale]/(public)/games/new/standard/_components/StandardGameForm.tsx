'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { Button } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import type { Side } from '@blindfold-chess/types';

import { DEFAULT_ENGINE, type EngineKind } from '@/lib/engines';
import type { SkillLevel } from '@/lib/types';

import { CollapsibleGameSettings } from '@/app/[locale]/(public)/games/new/_components/CollapsibleGameSettings';
import { ColorSelector } from '@/app/[locale]/(public)/games/new/_components/ColorSelector';
import { EngineSelector } from '@/app/[locale]/(public)/games/new/_components/EngineSelector';
import { SkillLevelSelector } from '@/app/[locale]/(public)/games/new/_components/SkillLevelSelector';
import { useLocalGameSettings } from '@/app/[locale]/(public)/games/new/_hooks/use-local-game-settings';
import { SectionTitle } from '@/app/[locale]/_components/SectionTitle';
import type { Locale } from '@/app/[locale]/_lib/types';

type Props = {
  locale: Locale;
};

export function StandardGameForm({ locale }: Props) {
  const t = useTranslations('newGame');
  const router = useRouter();
  const [color, setColor] = useState<Side>('white');
  const [skillLevel, setSkillLevel] = useState<SkillLevel>(5);
  const [engine, setEngine] = useState<EngineKind>(DEFAULT_ENGINE);
  const [isLoading, setIsLoading] = useState(false);

  const { localSettings, handleSettingsChange } = useLocalGameSettings();

  const handleStartGame = () => {
    setIsLoading(true);

    const params: Record<string, string> = {
      color,
      skillLevel: skillLevel.toString(),
      gamePrefs: JSON.stringify(localSettings),
    };
    // Only include `engine` when it differs from the default — this keeps
    // share-links short for the common Stockfish case and avoids changing
    // existing user-visible URLs.
    if (engine !== DEFAULT_ENGINE) params.engine = engine;
    const searchParams = new URLSearchParams(params);

    router.push(`/${locale}/games/play?${searchParams.toString()}`);
  };

  return (
    <div className="space-y-4">
      <ColorSelector value={color} onChange={setColor} />
      <EngineSelector value={engine} onChange={setEngine} />
      {engine === 'stockfish' && <SkillLevelSelector value={skillLevel} onChange={setSkillLevel} />}

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
    </div>
  );
}
