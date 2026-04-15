'use client';

import { useEffect, useState } from 'react';

import { MAX_GAMES } from '@/config';

import { LocalStorageGameRepository } from '@/lib/games/local-storage-repository';

import type { Locale } from '@/app/[locale]/_lib/types';

import { GameLimitError } from './GameLimitError';

type Props = {
  locale: Locale;
  children: React.ReactNode;
};

export function GameLimitCheck({ locale, children }: Props) {
  const [isOverLimit, setIsOverLimit] = useState<boolean | null>(null);

  useEffect(() => {
    const checkGameLimit = async () => {
      const repository = new LocalStorageGameRepository();
      const games = await repository.loadAll();
      setIsOverLimit(games.length >= MAX_GAMES);
    };
    checkGameLimit();
  }, []);

  if (isOverLimit === null) {
    return <div className="animate-pulse h-96" />;
  }

  if (isOverLimit) {
    return <GameLimitError locale={locale} />;
  }

  return <>{children}</>;
}
