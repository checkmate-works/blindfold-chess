import { useNavigation, useRouter } from "expo-router";
import type { Href } from "expo-router";
import { useCallback } from "react";

/**
 * Leaves the full-screen `(session)` modal from any screen inside it.
 *
 * @description
 * A session, its result and a training run are all screens of the
 * `(session)` stack, which the root stack presents as one full-screen modal
 * over the setup screen they were started from. Leaving therefore pops that
 * modal off the root stack (the screen's navigator's parent), not a screen of
 * the inner stack: popping inside would only reveal the session the result
 * replaced, or nothing.
 *
 * - `close()` reveals the setup screen underneath — "play again" and the ×.
 * - `closeToMenu()` pops the root stack to the tabs — "back to menu".
 *
 * When the modal is the first route (the app was opened on a deep link, or
 * restored after the process was killed), nothing is underneath it; both
 * fall back to replacing the route with `fallbackHref`.
 */
export function useCloseSession(fallbackHref: Href = "/practice") {
  const navigation = useNavigation();
  const router = useRouter();

  const close = useCallback(() => {
    const root = navigation.getParent();
    if (root?.canGoBack()) {
      root.goBack();
    } else {
      router.replace(fallbackHref);
    }
  }, [navigation, router, fallbackHref]);

  const closeToMenu = useCallback(() => {
    const root = navigation.getParent();
    if (root?.canGoBack()) {
      // `popToTop` exists on stack navigators only; the root is one.
      (root as unknown as { popToTop: () => void }).popToTop();
    } else {
      router.replace(fallbackHref);
    }
  }, [navigation, router, fallbackHref]);

  return { close, closeToMenu };
}
