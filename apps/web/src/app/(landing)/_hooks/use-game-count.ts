import { useCallback, useEffect, useState } from 'react';

import { GAME_UPDATED_EVENT } from '@/config';

import { LocalStorageGameRepository } from '@/lib/repositories';

type Return = {
  count: number;
  isLoading: boolean;
};

export function useGameCount(): Return {
  const [count, setCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const loadCount = useCallback(async () => {
    setIsLoading(true);
    try {
      const gameRepository = new LocalStorageGameRepository();
      const games = await gameRepository.loadAll();
      setCount(games.length);
    } catch (error) {
      console.error('Failed to load game count:', error);
      setCount(0);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCount();

    const handleGameUpdated = () => {
      loadCount();
    };

    window.addEventListener(GAME_UPDATED_EVENT, handleGameUpdated);

    return () => {
      window.removeEventListener(GAME_UPDATED_EVENT, handleGameUpdated);
    };
  }, [loadCount]);

  return {
    count,
    isLoading,
  };
}
