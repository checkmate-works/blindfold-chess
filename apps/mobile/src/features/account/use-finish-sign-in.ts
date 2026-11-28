import { useCallback } from "react";
import { useNavigation } from "expo-router";

import { refreshAccount } from "../../auth/use-auth";

/**
 * What every way of signing in does once Supabase has a session: reload the
 * account, then send an account that has no username yet (a first sign-in,
 * the web's 仮登録) on to choose one — the web's 本登録 — and otherwise close
 * the `(account)` modal. Called from a screen inside that modal.
 */
export function useFinishSignIn(): () => Promise<void> {
  const navigation = useNavigation();
  return useCallback(async () => {
    const account = await refreshAccount();
    if (account && account.username === null) {
      // Username setup becomes the modal's only screen, so it gets the ×
      // rather than a back chevron (and edge swipe) into the welcome or
      // sign-in screen of an account that is now signed in. A `replace`
      // would swap only the top screen and leave those under it.
      // `reset` exists on every navigator; the untyped route list is the
      // account stack's own (`app/(account)/_layout.tsx`).
      (
        navigation as unknown as {
          reset: (state: { index: number; routes: { name: string }[] }) => void;
        }
      ).reset({ index: 0, routes: [{ name: "setup-username" }] });
    } else {
      navigation.getParent()?.goBack();
    }
  }, [navigation]);
}
