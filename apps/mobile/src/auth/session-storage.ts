import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

/**
 * Where supabase-js keeps the session (access and refresh tokens): the
 * Keychain / Android Keystore through SecureStore, not AsyncStorage, which
 * is plain files. The web preview has no SecureStore and uses AsyncStorage
 * (localStorage there).
 *
 * `AFTER_FIRST_UNLOCK` lets a token refresh run while the phone is locked
 * after it has been unlocked once since boot.
 */
const OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
};

export const sessionStorage =
  Platform.OS === "web"
    ? AsyncStorage
    : {
        getItem: (key: string) => SecureStore.getItemAsync(key, OPTIONS),
        setItem: (key: string, value: string) =>
          SecureStore.setItemAsync(key, value, OPTIONS),
        removeItem: (key: string) => SecureStore.deleteItemAsync(key, OPTIONS),
      };
