'use client';

import { useEffect, useState } from 'react';

import { MAX_GAMES } from '@/config';

import { LocalStorageGameRepository } from '@/lib/repositories';

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

  // Loading state
  if (isOverLimit === null) {
    return <div className="animate-pulse h-96" />;
  }

  // Over limit - show error
  if (isOverLimit) {
    return <GameLimitError locale={locale} />;
  }

  // Under limit - show children
  return <>{children}</>;
}
