import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { Snackbar } from "../components/Snackbar";
import {
  getScreenNotice,
  subscribeScreenNotice,
  takeScreenNotice,
  type ScreenNotice,
} from "./screen-notice";

/**
 * Shows the notice another screen (or a row on this one) posted to
 * `screen-notice.ts`: "Game saved" with Resume, "Session quit", "Training
 * ended", a saved game deleted or not.
 *
 * Rendered by every screen an action can land on: each practice and AI-game
 * setup (`PracticeSetupScreen` draws it), the play tab, the saved games and
 * a saved game's page.
 *
 * Only the focused screen takes the notice, so while the session modal is
 * still up nothing below it does, and of two screens mounted under one
 * another (the play tab under the setup screen) only the top one shows it.
 * Leaving the screen takes the snackbar away with it.
 *
 * Render it as the last child of the screen's outermost view, or of the
 * area above a `BottomBar` (see `Snackbar`).
 */
export function ScreenNoticeSnackbar() {
  const { t } = useTranslation();
  const router = useRouter();
  const [focused, setFocused] = useState(false);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );
  const pending = useSyncExternalStore(subscribeScreenNotice, getScreenNotice);
  const [shown, setShown] = useState<ScreenNotice | null>(null);

  useEffect(() => {
    if (!focused) {
      setShown(null);
      return;
    }
    if (!pending) return;
    const notice = takeScreenNotice();
    if (notice) setShown(notice);
  }, [focused, pending]);

  if (!shown) return null;
  const key = `${shown.kind}:${shown.postedAt}`;
  const onDismiss = () => setShown(null);

  if (shown.kind === "gameSaved") {
    const { gameId } = shown;
    return (
      <Snackbar
        key={key}
        message={t("gameHistory.savedNotice")}
        actionLabel={t("gameHistory.resumeShort")}
        onAction={() =>
          router.push({
            pathname: "/play/ai-game/session",
            params: { resume: gameId },
          })
        }
        onDismiss={onDismiss}
      />
    );
  }

  return (
    <Snackbar key={key} message={messageFor(shown, t)} onDismiss={onDismiss} />
  );
}

function messageFor(
  notice: Exclude<ScreenNotice, { kind: "gameSaved" }>,
  t: (key: string) => string,
): string {
  switch (notice.kind) {
    case "gameSaveFailed":
      return t("gameHistory.saveFailedNotice");
    case "gameDeleted":
      return t("gameHistory.deletedNotice");
    case "gameDeleteFailed":
      return t("gameHistory.deleteFailedNotice");
    case "sessionQuit":
      return t("common.sessionQuitNotice");
    case "trainingEnded":
      return t("common.trainingEndedNotice");
  }
}
