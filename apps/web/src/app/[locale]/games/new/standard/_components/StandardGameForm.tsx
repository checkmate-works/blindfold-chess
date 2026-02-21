'use client';

import { useState } from 'react';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

import { Button } from '@/app/_components';
import type { Side } from '@blindfold-chess/types';

import type { SkillLevel } from '@/lib/types';

import type { Locale } from '@/app/[locale]/_lib/types';
import { ColorSelector } from '@/app/[locale]/games/new/_components/ColorSelector';
import { SkillLevelSelector } from '@/app/[locale]/games/new/_components/SkillLevelSelector';

type Props = {
  locale: Locale;
};

export function StandardGameForm({ locale }: Props) {
  const t = useTranslations('newGame');
  const router = useRouter();
  const [color, setColor] = useState<Side>('white');
  const [skillLevel, setSkillLevel] = useState<SkillLevel>(5);
  const [isLoading, setIsLoading] = useState(false);

  const handleStartGame = () => {
    setIsLoading(true);

    const searchParams = new URLSearchParams({
      color,
      skillLevel: skillLevel.toString(),
    });

    router.push(`/${locale}/play?${searchParams.toString()}`);
  };

  return (
    <div className="space-y-4">
      <ColorSelector value={color} onChange={setColor} />
      <SkillLevelSelector value={skillLevel} onChange={setSkillLevel} />
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
