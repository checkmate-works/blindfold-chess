import { useTranslation } from "react-i18next";
import { useLocalSearchParams } from "expo-router";

import {
  PracticeResultScreen,
  PracticeStatsResultCard,
} from "../../../../components";
import { parsePracticeStatsParams } from "../../../../lib/practice-result-params";
import type { PracticeStatsParams } from "../../../../lib/practice-result-params";

export default function SquareColorsResult() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<PracticeStatsParams>();
  const result = parsePracticeStatsParams(params);

  return (
    <PracticeResultScreen
      title={t("squareColors.result.title")}
      playAgainLabel={t("squareColors.result.playAgain")}
      backToMenuLabel={t("squareColors.result.backToMenu")}
      setupHref="/(tabs)/practice/square-colors/setup"
    >
      <PracticeStatsResultCard result={result} />
    </PracticeResultScreen>
  );
}
