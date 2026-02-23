import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type UsePersistentSettingsReturn<T extends Record<string, unknown>> = {
  settings: T;
  isLoading: boolean;
  updateSettings: (partial: Partial<T>) => void;
  saveSettings: (newSettings: T) => Promise<void>;
  resetSettings: () => void;
};

export function usePersistentSettings<T extends Record<string, unknown>>(
  storageKey: string,
  defaults: T,
): UsePersistentSettingsReturn<T> {
  const [settings, setSettings] = useState<T>(defaults);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const stored = await AsyncStorage.getItem(storageKey);
        if (stored) {
          const parsed = JSON.parse(stored) as T;
          setSettings(parsed);
        }
      } catch {
        // Use defaults on error
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, [storageKey]);

  const updateSettings = useCallback(
    (partial: Partial<T>) => {
      setSettings((prev) => {
        const next = { ...prev, ...partial };
        AsyncStorage.setItem(storageKey, JSON.stringify(next)).catch(() => {});
        return next;
      });
    },
    [storageKey],
  );

  const saveSettings = useCallback(
    async (newSettings: T) => {
      try {
        await AsyncStorage.setItem(storageKey, JSON.stringify(newSettings));
        setSettings(newSettings);
      } catch {
        // Silently fail on save error
      }
    },
    [storageKey],
  );

  const resetSettings = useCallback(() => {
    setSettings(() => {
      AsyncStorage.setItem(storageKey, JSON.stringify(defaults)).catch(
        () => {},
      );
      return defaults;
    });
  }, [storageKey, defaults]);

  return {
    settings,
    isLoading,
    updateSettings,
    saveSettings,
    resetSettings,
  };
}
