import { ContentLayout } from "@/components/layouts";
import { TopPage } from "@/features/home/";
import { useTranslation } from "react-i18next";

export const Home = () => {
  const { t } = useTranslation();
  return (
    <ContentLayout title={t("game.title")}>
      <TopPage />
    </ContentLayout>
  );
};
