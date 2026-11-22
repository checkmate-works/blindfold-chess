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

let lastUserId: string | undefined;

/** The `/me` request in progress, and the user it was made for. */
let inFlight:
  | { userId: string | undefined; promise: Promise<MobileAccount | undefined> }
  | undefined;

/**
 * Re-reads the account from the server: after sign-in, a username change or
 * a recorded challenge, and again from the settings tab while the account is
 * still missing. That last caller is the recovery path for a launch that was
 * offline or got a 503 — without it `account` would stay undefined until the
 * next cold start, hiding the progress card and the way to set a username.
 *
 * Calls made while a request for the same user is in progress share it
 * instead of sending another (sign-in and the auth listener both ask at
 * once; the settings tab asks on every focus). The shared answer can predate
 * a change made after it was sent; every caller that changes the account
 * calls this again afterwards, and the overlap only happens while a retry is
 * pending. A request made for a user who has since signed out or been
 * replaced is not shared and its answer is dropped, so one account never
 * shows under another.
 *
 * Must not be called from inside the Supabase auth listener: the request
 * reads the session, which waits on the lock supabase-js holds while the
 * listener runs.
 */
export function refreshAccount(): Promise<MobileAccount | undefined> {
  if (state.status !== "signedIn") return Promise.resolve(undefined);
  const userId = lastUserId;
  if (inFlight && inFlight.userId === userId) return inFlight.promise;
  const promise = fetchAccount()
    .then((result) => {
      if (lastUserId !== userId) return undefined;
      if ("error" in result) {
        setState({ accountError: true });
        return undefined;
      }
      setState({ account: result, accountError: false });
      return result;
    })
    .finally(() => {
      if (inFlight?.promise === promise) inFlight = undefined;
    });
  inFlight = { userId, promise };
  return promise;
}

export async function signOut(): Promise<void> {
  await supabase?.auth.signOut({ scope: "local" });
}

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
