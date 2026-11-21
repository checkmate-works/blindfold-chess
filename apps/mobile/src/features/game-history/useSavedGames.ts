import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";

import { loadSavedGames, type SavedGame } from "./game-history";

/** The saved games, re-read whenever the screen comes into focus. */
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
  return games;
}
