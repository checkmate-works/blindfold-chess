import Constants from "expo-constants";
import { AppState } from "react-native";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { resolveBackendConfig } from "./config";
import { sessionStorage } from "./session-storage";

export const backendConfig = resolveBackendConfig({
  env: {
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseKey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    apiOrigin: process.env.EXPO_PUBLIC_API_ORIGIN,
  },
  isDev: __DEV__,
  devHost: Constants.expoConfig?.hostUri?.replace(/:\d+$/, ""),
});

/**
 * The app's Supabase client, or undefined when the build has no backend
 * (see `resolveBackendConfig`). Used for authentication only: every read and
 * write of data goes through the web app's mobile API, which applies the
 * same checks as the web.
 *
 * Token refresh runs only while the app is in the foreground, as
 * supabase-js recommends for React Native.
 */
export const supabase: SupabaseClient | undefined = backendConfig
  ? createClient(backendConfig.supabaseUrl, backendConfig.supabaseKey, {
      auth: {
        storage: sessionStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : undefined;

if (supabase) {
  const client = supabase;
  if (AppState.currentState === "active") void client.auth.startAutoRefresh();
  AppState.addEventListener("change", (state) => {
    if (state === "active") void client.auth.startAutoRefresh();
    else void client.auth.stopAutoRefresh();
  });
}
