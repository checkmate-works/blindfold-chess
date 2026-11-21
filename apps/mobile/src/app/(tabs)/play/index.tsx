import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { TabScrollView } from "../../../components";
import { AiGameCard } from "../../../features/ai-game/components/AiGameCard";

/** The play tab: games against the engine. */
export default function PlayTab() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <TabScrollView>
      <AiGameCard
        buttonTitle={t("aiGame.setup.startGame")}
        onPress={() => router.push("/play/ai-game")}
      />
    </TabScrollView>
  );
}
