import { useNavigation, useRouter } from "expo-router";
import type { Href } from "expo-router";
import { useCallback } from "react";

import { routeNameBelow } from "./route-below";

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
 * - `closeOnto(name, href)` closes onto the root-stack screen `name`: when
 *   the modal was opened from somewhere else (a game resumed from the play
 *   tab), it closes and then pushes `href`, so "play again" still lands on
 *   a setup rather than on whatever happened to be underneath.
 * - `closeAndPush(href)` leaves the modal for another root-stack screen (an
 *   article, My Records). Pushed from inside the modal, that screen would
 *   open under it on iOS, out of sight; this closes first, so the screen
 *   opens over the setup and its back button returns there.
 * - `closeToMenu()` — "back to menu" — returns to the screen the setup
 *   was opened from: it pops the modal and the screen under it (the setup,
 *   or a saved game's page), landing on the practice list, a dojo rank's
 *   requirements, My Records or the saved games, wherever the player chose
 *   this from. With only the tabs under the modal it pops to them.
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

  const closeOnto = useCallback(
    (name: string, href: Href) => {
      const root = navigation.getParent();
      if (!root?.canGoBack()) {
        router.replace(href);
        return;
      }
      const revealed = routeNameBelow(root.getState());
      root.goBack();
      if (revealed !== name) router.push(href);
    },
    [navigation, router],
  );

  const closeAndPush = useCallback(
    (href: Href) => {
      close();
      router.push(href);
    },
    [close, router],
  );

  const closeToMenu = useCallback(() => {
    const root = navigation.getParent();
    if (root?.canGoBack()) {
      // `pop` exists on stack navigators only; the root is one. Two routes
      // come off — the modal and the setup under it — or just the modal
      // when the tabs are right underneath.
      const stack = root as unknown as { pop: (count: number) => void };
      stack.pop(Math.min(2, root.getState().index));
    } else {
      router.replace(fallbackHref);
    }
  }, [navigation, router, fallbackHref]);

  return { close, closeOnto, closeAndPush, closeToMenu };
}
