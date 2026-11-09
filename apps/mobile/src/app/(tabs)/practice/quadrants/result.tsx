import { useTranslation } from "react-i18next";
import { useLocalSearchParams } from "expo-router";

import {
  PracticeResultScreen,
  PracticeStatsResultCard,
} from "../../../../components";
import { parsePracticeStatsParams } from "../../../../lib/practice-result-params";
import type { PracticeStatsParams } from "../../../../lib/practice-result-params";

export default function QuadrantsResult() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<PracticeStatsParams>();
  const result = parsePracticeStatsParams(params);

  return (
    <PracticeResultScreen
      title={t("quadrants.result.title")}
      playAgainLabel={t("quadrants.result.playAgain")}
      backToMenuLabel={t("quadrants.result.backToMenu")}
      setupHref="/(tabs)/practice/quadrants/setup"
    >
      <PracticeStatsResultCard result={result} />
    </PracticeResultScreen>
  );
}
