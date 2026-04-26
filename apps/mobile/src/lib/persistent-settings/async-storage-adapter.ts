import AsyncStorage from "@react-native-async-storage/async-storage";
import type { PersistentStorage } from "@blindfold-chess/features/common";

/**
 * `PersistentStorage` adapter backed by React Native's AsyncStorage.
 * Both operations are asynchronous — the shared hook awaits them
 * uniformly and exposes `isLoaded` on hydration.
 */
export const asyncStorageAdapter: PersistentStorage = {
  get(key) {
    return AsyncStorage.getItem(key);
  },
  async set(key, value) {
    await AsyncStorage.setItem(key, value);
  },
};
