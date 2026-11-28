import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { Snackbar } from "../../components";
import {
  getSavedGameNotice,
  subscribeSavedGameNotice,
  takeSavedGameNotice,
  type SavedGameNotice,
} from "./saved-game-notice";

/**
 * "Game saved", with Resume, on a screen an unfinished AI game can be
 * closed back to: the AI-game setup, the play tab, the saved games and a
 * saved game's page (see `saved-game-notice.ts` for why it is needed).
 *
 * Only the focused screen takes the notice, so while the session modal is
 * still up nothing below it does, and of two screens mounted under one
 * another (the play tab under the setup screen) only the top one shows it.
 * Leaving the screen takes the snackbar away with it.
 *
 * Render it as the last child of the screen's outermost view, or of the
 * area above a `BottomBar` (see `Snackbar`).
 */
export function SavedGameSnackbar() {
  const { t } = useTranslation();
  const router = useRouter();
  const [focused, setFocused] = useState(false);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );
  const pending = useSyncExternalStore(
    subscribeSavedGameNotice,
    getSavedGameNotice,
  );
  const [shown, setShown] = useState<SavedGameNotice | null>(null);

  useEffect(() => {
    if (!focused) {
      setShown(null);
      return;
    }
    if (!pending) return;
    const notice = takeSavedGameNotice();
    if (notice) setShown(notice);
  }, [focused, pending]);

  if (!shown) return null;
  return (
    <Snackbar
      key={`${shown.gameId}:${shown.postedAt}`}
      message={t("gameHistory.savedNotice")}
      actionLabel={t("gameHistory.resumeShort")}
      onAction={() =>
        router.push({
          pathname: "/play/ai-game/session",
          params: { resume: shown.gameId },
        })
      }
      onDismiss={() => setShown(null)}
    />
  );
}
