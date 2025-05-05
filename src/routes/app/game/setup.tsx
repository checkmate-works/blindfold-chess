import { GameSetting } from "@/features/game";
import { ContentLayout } from "@/components/layouts";
import { useTranslation } from "react-i18next";

export const GameSetup = () => {
  const { t } = useTranslation();

  return (
    <ContentLayout title={t("game.title")}>
      <GameSetting />
    </ContentLayout>
  );
};
