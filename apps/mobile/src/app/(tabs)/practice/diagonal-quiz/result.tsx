import { useTranslation } from "react-i18next";
import { useLocalSearchParams } from "expo-router";

import {
  PracticeResultScreen,
  PracticeStatsResultCard,
} from "../../../../components";
import { parsePracticeStatsParams } from "../../../../lib/practice-result-params";
import type { PracticeStatsParams } from "../../../../lib/practice-result-params";

export default function DiagonalQuizResult() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<PracticeStatsParams>();
  const result = parsePracticeStatsParams(params);

  return (
    <PracticeResultScreen
      title={t("diagonalQuiz.result.title")}
      playAgainLabel={t("diagonalQuiz.result.playAgain")}
      backToMenuLabel={t("diagonalQuiz.result.backToMenu")}
      setupHref="/(tabs)/practice/diagonal-quiz/setup"
    >
      <PracticeStatsResultCard result={result} />
    </PracticeResultScreen>
  );
}
