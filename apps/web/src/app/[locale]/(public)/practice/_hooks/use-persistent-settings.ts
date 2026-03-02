'use client';

import { useEffect, useState } from 'react';

export function usePersistentSettings<T extends Record<string, unknown>>(
  storageKey: string,
  defaults: T
): { settings: T; updateSettings: (partial: Partial<T>) => void; isLoaded: boolean } {
  const [settings, setSettings] = useState<T>(defaults);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load settings from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Partial<T>;
        setSettings((prev) => ({ ...prev, ...parsed }));
      } catch {
        // Ignore invalid JSON in localStorage
      }
    }
    setIsLoaded(true);
  }, [storageKey]);

  // Save settings to localStorage when they change
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(storageKey, JSON.stringify(settings));
    }
  }, [settings, isLoaded, storageKey]);

  const updateSettings = (partial: Partial<T>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  };

  return { settings, updateSettings, isLoaded };
}
