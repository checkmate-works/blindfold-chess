import { useLocation, Navigate } from "react-router-dom";
import { GamePlay as GamePlayContainer } from "@/features/game";
import { ContentLayout } from "@/components/layouts";
import { GameSettings, AlgebraicNotation } from "@/types";
import { useTranslation } from "react-i18next";

export type PlayScreenState = {
  gameId?: string;
  settings: GameSettings;
  initialMoves: AlgebraicNotation[];
};

export const GamePlay = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const state = location.state as PlayScreenState;

  if (!state?.settings) {
    return <Navigate to="/game/setup" replace />;
  }

  return (
    <ContentLayout title={t("game.title")}>
      <GamePlayContainer
        settings={state.settings}
        initialMoves={state.initialMoves || []}
        gameId={state.gameId}
      />
    </ContentLayout>
  );
};
