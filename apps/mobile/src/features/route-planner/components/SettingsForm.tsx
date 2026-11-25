import { StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import {
  ROUTE_PLANNER_CHALLENGE_PIECES,
  type RoutePlannerChallengePiece,
} from "@blindfold-chess/features/route-planner";

import { ListSection, PieceSelector } from "../../../components";
import { spacing } from "../../../theme";

const PIECES = Object.keys(
  ROUTE_PLANNER_CHALLENGE_PIECES,
) as RoutePlannerChallengePiece[];

type SettingsFormProps = {
  selectedPiece: RoutePlannerChallengePiece;
  onChange: (piece: RoutePlannerChallengePiece) => void;
};

/**
 * The setup screen's "Game Settings" panel: the piece to route, knight or
 * bishop, as the web's piece buttons.
 */
export function SettingsForm({ selectedPiece, onChange }: SettingsFormProps) {
  const { t } = useTranslation();
  return (
    <ListSection title={t("common.gameSettings")}>
      <View style={styles.body}>
        <PieceSelector
          label={t("routePlanner.setup.pieceSelection")}
          options={PIECES}
          value={selectedPiece}
          onChange={onChange}
          pieceOf={(piece) => ROUTE_PLANNER_CHALLENGE_PIECES[piece]}
          // routePlanner.pieces.{n,b}
          formatOption={(piece) =>
            t(`routePlanner.pieces.${ROUTE_PLANNER_CHALLENGE_PIECES[piece]}`)
          }
        />
      </View>
    </ListSection>
  );
}

const styles = StyleSheet.create({
  body: {
    padding: spacing.md,
  },
});
