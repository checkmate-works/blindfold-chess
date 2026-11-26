import { useTranslation } from "react-i18next";

import { Button } from "../components/Button";
import { useQuitSession } from "./use-quit-session";

/**
 * The "Quit" link under a timed session's score, asking before it leaves:
 * the shared compact text action. It does
 * what the header's × does; the link sits where the eye already is at the
 * end of a run, as on the web.
 */
export function SessionQuitLink() {
  const { t } = useTranslation();
  const handlePress = useQuitSession({ confirm: true });

  return (
    <Button
      title={t("common.quit")}
      onPress={handlePress}
      variant="ghost"
      size="sm"
      testID="session-quit"
      style={{ alignSelf: "center" }}
    />
  );
}
