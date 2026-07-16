import { useTranslation } from "react-i18next";
import { useLocalSearchParams } from "expo-router";

import {
  PracticeResultScreen,
  PracticeStatsResultCard,
} from "../../../../components";
import { parsePracticeStatsParams } from "../../../../lib/practice-result-params";
import type { PracticeStatsParams } from "../../../../lib/practice-result-params";

export default function BoardSymmetryResult() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<PracticeStatsParams>();
  const result = parsePracticeStatsParams(params);

  return (
    <PracticeResultScreen
      title={t("boardSymmetry.result.title")}
      playAgainLabel={t("boardSymmetry.result.playAgain")}
      backToMenuLabel={t("boardSymmetry.result.backToMenu")}
      setupHref="/(tabs)/practice/board-symmetry/setup"
    >
      <PracticeStatsResultCard
        result={result}
        timeTakenLabel={t("boardSymmetry.result.timeTaken")}
      />
    </PracticeResultScreen>
  );
}
