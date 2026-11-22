import { useCallback } from "react";
import { useFocusEffect, useNavigation, useRouter } from "expo-router";

import { useAuth } from "../../../auth/use-auth";
import { hasSignUpOffer, takeSignUpOffer } from "../sign-up-offer";

/**
 * Opens the account offer (`/welcome`) on the home tab after the first game
 * or practice onboarding started, once, for a signed-out player.
 *
 * Onboarding ends by putting the home tab underneath and the session modal
 * on top in the same tick, so home can be focused for a moment before the
 * session covers it. The check therefore runs only once the flag has been
 * read and only if home is still focused then; closing the session focuses
 * home again and the offer opens. A player who signed in meanwhile, or a
 * build without accounts, just drops the flag.
 */
export function useSignUpOffer() {
  const router = useRouter();
  const navigation = useNavigation();
  const { status } = useAuth();

  useFocusEffect(
    useCallback(() => {
      if (status === "loading") return;
      let cancelled = false;
      void (async () => {
        if (!(await hasSignUpOffer())) return;
        if (cancelled || !navigation.isFocused()) return;
        await takeSignUpOffer();
        if (status === "signedOut") router.push("/welcome");
      })();
      return () => {
        cancelled = true;
      };
    }, [status, navigation, router]),
  );
}
