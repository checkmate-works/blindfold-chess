import { useCallback, useLayoutEffect } from "react";
import { useNavigation } from "expo-router";

import { SessionCloseButton } from "./SessionCloseButton";
import { FROM_GAME } from "./from-game";
import { useCloseSession } from "./use-close-session";

/**
 * The way back to the AI game a practice session was opened from, or
 * `undefined` when the session was not opened from one.
 *
 * @description
 * The game's session and the practice opened from it are screens of the same
 * `(session)` stack, so the game stays mounted underneath (its engine, its
 * board, its unsaved peek state) and going back is popping the practice off
 * that inner stack. `useCloseSession` would instead pop the whole modal and
 * drop the player out of the game. The practice's result replaces its
 * session, so from either screen the one below is the game.
 *
 * While active, the header's × is replaced with one that goes back to the
 * game too (asking first when `confirm`, as the session's own × does), since
 * the registered one closes the modal.
 *
 * When the inner stack has nothing below (the route was restored on its
 * own), it falls back to closing the modal.
 */
export function useReturnToGame({
  from,
  confirm = false,
}: {
  readonly from: string | undefined;
  readonly confirm?: boolean;
}): (() => void) | undefined {
  const navigation = useNavigation();
  const { close } = useCloseSession();
  const active = from === FROM_GAME;

  const backToGame = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      close();
    }
  }, [navigation, close]);

  useLayoutEffect(() => {
    if (!active) return;
    navigation.setOptions({
      headerLeft: () => (
        <SessionCloseButton confirm={confirm} onClose={backToGame} />
      ),
    });
  }, [active, confirm, navigation, backToGame]);

  return active ? backToGame : undefined;
}
