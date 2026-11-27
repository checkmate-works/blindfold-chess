import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";

import { loadSavedGames, type SavedGame } from "./game-history";

/**
 * The saved games, re-read whenever the screen comes into focus, and
 * `reload` to read them again after a change made on the screen itself
 * (a row deleted from the list). `games` is null until the first read.
 */
export function useSavedGames() {
  const [games, setGames] = useState<SavedGame[] | null>(null);
  useFocusEffect(
    useCallback(() => {
      let active = true;
      void loadSavedGames().then((loaded) => {
        if (active) setGames(loaded);
      });
      return () => {
        active = false;
      };
    }, []),
  );
  const reload = useCallback(() => {
    void loadSavedGames().then(setGames);
  }, []);
  return { games, reload };
}
