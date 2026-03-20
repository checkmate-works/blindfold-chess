'use client';

import { useState } from 'react';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

import { Button } from '@/app/_components';
import type { Side } from '@blindfold-chess/types';

import type { SkillLevel } from '@/lib/types';

import { CollapsibleGameSettings } from '@/app/[locale]/(public)/games/new/_components/CollapsibleGameSettings';
import { ColorSelector } from '@/app/[locale]/(public)/games/new/_components/ColorSelector';
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
  const [isLoading, setIsLoading] = useState(false);

  const { localSettings, handleSettingsChange } = useLocalGameSettings();

  const handleStartGame = () => {
    setIsLoading(true);

    const searchParams = new URLSearchParams({
      color,
      skillLevel: skillLevel.toString(),
      gamePrefs: JSON.stringify(localSettings),
    });

    router.push(`/${locale}/games/play?${searchParams.toString()}`);
  };

  return (
    <div className="space-y-4">
      <ColorSelector value={color} onChange={setColor} />
      <SkillLevelSelector value={skillLevel} onChange={setSkillLevel} />

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
