/**
 * Where the app finds Supabase and the web app's mobile API.
 *
 * Production builds take both from `EXPO_PUBLIC_*` variables baked in at
 * build time. A development build without them talks to the local stack the
 * web app's `supabase start` + `next dev` run (Supabase on :54321, the web on
 * :3000) on the machine serving Metro, so sign-in works against the dev seed
 * users with no configuration. A release build without them has no
 * accounts: `resolveBackendConfig` returns undefined and the app runs
 * signed-out only.
 */

/** The Supabase CLI's fixed local publishable key (`supabase status`). */
const LOCAL_SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH";

export type BackendConfig = {
  readonly supabaseUrl: string;
  readonly supabaseKey: string;
  /** Origin of the web app serving `/api/mobile/v1/*`. */
  readonly apiOrigin: string;
};

export function resolveBackendConfig({
  env,
  isDev,
  devHost,
}: {
  readonly env: {
    readonly supabaseUrl?: string;
    readonly supabaseKey?: string;
    readonly apiOrigin?: string;
  };
  readonly isDev: boolean;
  /** Host of the Metro server (`hostUri` without the port), in development. */
  readonly devHost: string | undefined;
}): BackendConfig | undefined {
  if (env.supabaseUrl && env.supabaseKey && env.apiOrigin) {
    return {
      supabaseUrl: env.supabaseUrl,
      supabaseKey: env.supabaseKey,
      apiOrigin: env.apiOrigin.replace(/\/$/, ""),
    };
  }
  if (!isDev) return undefined;
  const host = devHost || "localhost";
  return {
    supabaseUrl: env.supabaseUrl || `http://${host}:54321`,
    supabaseKey: env.supabaseKey || LOCAL_SUPABASE_PUBLISHABLE_KEY,
    apiOrigin: (env.apiOrigin || `http://${host}:3000`).replace(/\/$/, ""),
  };
}
