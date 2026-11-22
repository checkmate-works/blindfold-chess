import { useCallback } from "react";
import { useNavigation, useRouter } from "expo-router";

import { refreshAccount } from "../../auth/use-auth";

/**
 * What every way of signing in does once Supabase has a session: reload the
 * account, then send an account that has no username yet (a first sign-in,
 * the web's 仮登録) on to choose one — the web's 本登録 — and otherwise close
 * the `(account)` modal. Called from a screen inside that modal.
 */
export function useFinishSignIn(): () => Promise<void> {
  const router = useRouter();
  const navigation = useNavigation();
  return useCallback(async () => {
    const account = await refreshAccount();
    if (account && account.username === null) {
      router.replace("/setup-username");
    } else {
      navigation.getParent()?.goBack();
    }
  }, [router, navigation]);
}
