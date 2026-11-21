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
      playAgainLabel={t("boardSymmetry.result.playAgain")}
      backToMenuLabel={t("boardSymmetry.result.backToMenu")}
      setupHref="/practice/board-symmetry"
    >
      <PracticeStatsResultCard
        result={result}
        timeTakenLabel={t("boardSymmetry.result.timeTaken")}
      />
    </PracticeResultScreen>
  );
}
