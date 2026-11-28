import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";

import {
  loadSavedGames,
  subscribeToSavedGames,
  type SavedGame,
} from "./game-history";

/**
 * The saved games, re-read whenever the screen comes into focus and after
 * every write to them while it stays focused, plus `reload` to read them
 * again on demand. `games` is null until the first read.
 *
 * @description
 * The read on focus alone is not enough. Closing a resumed session focuses
 * the list at once, while the session's last `saveGame` may still be queued
 * (`loadSavedGames` does not wait for the write queue), so that read can
 * carry the game one move behind. The write's notification comes after the
 * queue has written, so reading again then puts the list level with the
 * play tab's badge, which counts from the same notification.
 */
export function useSavedGames() {
  const [games, setGames] = useState<SavedGame[] | null>(null);
  useFocusEffect(
    useCallback(() => {
      let active = true;
      const read = () => {
        void loadSavedGames().then((loaded) => {
          if (active) setGames(loaded);
        });
      };
      read();
      const unsubscribe = subscribeToSavedGames(read);
      return () => {
        active = false;
        unsubscribe();
      };
    }, []),
  );
  const reload = useCallback(() => {
    void loadSavedGames().then(setGames);
  }, []);
  return { games, reload };
}
