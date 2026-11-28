import { useEffect, useState } from "react";

import {
  countInProgress,
  loadSavedGames,
  subscribeToSavedGames,
} from "./game-history";

/**
 * The number of saved AI games still in progress, for the play tab's badge.
 *
 * @description
 * The tabs layout that shows the badge stays mounted for the app's whole
 * life and is never "focused" the way a screen is, so `useFocusEffect` would
 * read the games once and go stale. The count is read once on mount and
 * again after every write to the saved games (`subscribeToSavedGames`): a
 * move saved in the session, a game finished, a row deleted from a list. It
 * is 0 until the first read.
 */
export function useInProgressGameCount(): number {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let active = true;
    const read = () => {
      void loadSavedGames().then((games) => {
        if (active) setCount(countInProgress(games));
      });
    };
    read();
    const unsubscribe = subscribeToSavedGames(read);
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);
  return count;
}
