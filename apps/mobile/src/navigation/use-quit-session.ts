import { Alert } from "react-native";
import { useTranslation } from "react-i18next";

import { postScreenNotice } from "./screen-notice";
import { useCloseSession } from "./use-close-session";

/**
 * The handler behind every control that leaves the session modal: the × in
 * a header or top row, and the timed session's "Quit" link.
 *
 * @param confirm - Ask before leaving. Timed sessions pass true: closing one
 *   throws away the run. Results and training runs lose nothing.
 * @param onClose - Runs instead of the default close (e.g. a session's own
 *   finish).
 */
export function useQuitSession({
  confirm = false,
  onClose,
}: {
  readonly confirm?: boolean;
  readonly onClose?: () => void;
} = {}) {
  const { t } = useTranslation();
  const { close } = useCloseSession();
  const leave = onClose ?? close;

  // A confirmed quit throws the run away, and the confirmation said so; the
  // screen the modal closes back to says it was done ("Session quit").
  // A session's own `onClose` goes somewhere else (its result) and says
  // nothing here.
  const quit = () => {
    leave();
    if (!onClose) postScreenNotice({ kind: "sessionQuit" });
  };

  return () => {
    if (!confirm) {
      leave();
      return;
    }
    Alert.alert(t("common.quitConfirmTitle"), t("common.quitConfirmMessage"), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("common.quit"), style: "destructive", onPress: quit },
    ]);
  };
}
