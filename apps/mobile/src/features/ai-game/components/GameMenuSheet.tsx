import { useTranslation } from "react-i18next";

import {
  BottomSheet,
  ListIcon,
  ListRow,
  ListSection,
} from "../../../components";
import { feedbackColors } from "../../../theme";

type GameMenuSheetProps = {
  visible: boolean;
  onClose: () => void;
  canUndo: boolean;
  canResign: boolean;
  /** Asks before taking the moves back; the sheet has closed by then. */
  onUndo: () => void;
  /** Asks before ending the game; the sheet has closed by then. */
  onResign: () => void;
};

/**
 * The AI game's rare actions — take back, resign — behind the "…" in the
 * session's top row.
 *
 * They used to sit in a row right under the keypad, a thumb's slip from the
 * submit key, for actions a game needs once if at all. Lichess and
 * Chess.com keep them out of the input's reach the same way, in a menu of
 * their own. Each still asks before it acts, as it did from the row.
 */
export function GameMenuSheet({
  visible,
  onClose,
  canUndo,
  canResign,
  onUndo,
  onResign,
}: GameMenuSheetProps) {
  const { t } = useTranslation();

  const run = (action: () => void) => () => {
    onClose();
    action();
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={t("aiGame.session.gameMenu")}
    >
      <ListSection>
        <ListRow
          title={t("aiGame.session.undo")}
          subtitle={t("aiGame.session.undoHint")}
          leading={<ListIcon ionicon="arrow-undo" />}
          accessory="none"
          disabled={!canUndo}
          onPress={run(onUndo)}
        />
        <ListRow
          title={t("aiGame.session.resign")}
          subtitle={t("aiGame.session.resignHint")}
          leading={<ListIcon ionicon="flag" tint={feedbackColors.error} />}
          accessory="none"
          disabled={!canResign}
          onPress={run(onResign)}
        />
      </ListSection>
    </BottomSheet>
  );
}
