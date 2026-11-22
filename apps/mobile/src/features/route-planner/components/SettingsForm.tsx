import { useTranslation } from "react-i18next";
import {
  ROUTE_PLANNER_CHALLENGE_PIECES,
  type RoutePlannerChallengePiece,
} from "@blindfold-chess/features/route-planner";

import { OptionsField } from "../../../components";

const PIECES = Object.keys(
  ROUTE_PLANNER_CHALLENGE_PIECES,
) as RoutePlannerChallengePiece[];

type SettingsFormProps = {
  selectedPiece: RoutePlannerChallengePiece;
  onChange: (piece: RoutePlannerChallengePiece) => void;
};

/** The piece to route: knight or bishop. */
export function SettingsForm({ selectedPiece, onChange }: SettingsFormProps) {
  const { t } = useTranslation();
  // routePlanner.pieces.{n,b}
  return (
    <OptionsField
      label={t("routePlanner.setup.pieceSelection")}
      options={PIECES}
      value={selectedPiece}
      onChange={onChange}
      formatOption={(piece) =>
        t(`routePlanner.pieces.${ROUTE_PLANNER_CHALLENGE_PIECES[piece]}`)
      }
    />
  );
}
