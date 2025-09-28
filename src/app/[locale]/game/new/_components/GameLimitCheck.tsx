'use client';

import { useEffect, useState } from 'react';
import { GameLimitError } from './GameLimitError';
import { LocalStorageGameRepository } from '@/lib/repositories';
import { MAX_GAMES } from '@/config';
import type { Locale } from '../../../_lib/types';

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
