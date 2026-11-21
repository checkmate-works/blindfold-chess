import { useSyncExternalStore } from "react";

import { fetchAccount, type MobileAccount } from "./account";
import { supabase } from "./supabase-client";

/**
 * - `unavailable` — the build has no backend; the app runs signed-out only.
 * - `loading` — the stored session is being read at launch.
 */
export type AuthStatus = "unavailable" | "loading" | "signedOut" | "signedIn";

export type AuthState = {
  status: AuthStatus;
  email: string | undefined;
  /** The server's view of the account; undefined until loaded or on error. */
  account: MobileAccount | undefined;
  /** The last account load failed (offline, server down). */
  accountError: boolean;
};

let state: AuthState = {
  status: supabase ? "loading" : "unavailable",
  email: undefined,
  account: undefined,
  accountError: false,
};
const listeners = new Set<() => void>();

function setState(patch: Partial<AuthState>) {
  state = { ...state, ...patch };
  for (const listener of listeners) listener();
}

/** Re-reads the account from the server (after sign-in or a username change). */
export async function refreshAccount(): Promise<MobileAccount | undefined> {
  if (state.status !== "signedIn") return undefined;
  const result = await fetchAccount();
  if ("error" in result) {
    setState({ accountError: true });
    return undefined;
  }
  setState({ account: result, accountError: false });
  return result;
}

export async function signOut(): Promise<void> {
  await supabase?.auth.signOut({ scope: "local" });
}

let lastUserId: string | undefined;
supabase?.auth.onAuthStateChange((_event, session) => {
  const user = session?.user;
  if (!user) {
    lastUserId = undefined;
    setState({
      status: "signedOut",
      email: undefined,
      account: undefined,
      accountError: false,
    });
    return;
  }
  const changed = user.id !== lastUserId;
  lastUserId = user.id;
  setState({
    status: "signedIn",
    email: user.email,
    ...(changed ? { account: undefined, accountError: false } : {}),
  });
  // Outside the callback: supabase-js holds a lock while it runs, and the
  // account request reads the session, which would wait on that lock.
  if (changed) setTimeout(() => void refreshAccount(), 0);
});

/**
 * The signed-in state, shared by every screen. A module-level store rather
 * than a provider: the Supabase listener above lives as long as the app,
 * and non-React code (the challenge recorder) reads it too.
 */
export function useAuth(): AuthState {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => state,
  );
}

export function getAuthState(): AuthState {
  return state;
}
