import { useTranslation } from "react-i18next";
import { useLocalSearchParams } from "expo-router";

import {
  PracticeResultScreen,
  PracticeStatsResultCard,
} from "../../../../components";
import { parsePracticeStatsParams } from "../../../../lib/practice-result-params";
import type { PracticeStatsParams } from "../../../../lib/practice-result-params";

export default function CoordinateQuizResult() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<
    PracticeStatsParams & { points?: string }
  >();
  const result = parsePracticeStatsParams(params);
  const points = parseInt(params.points || "0", 10);

  return (
    <PracticeResultScreen
      title={t("coordinateQuiz.result.title")}
      playAgainLabel={t("coordinateQuiz.result.playAgain")}
      backToMenuLabel={t("coordinateQuiz.result.backToMenu")}
      setupHref="/(tabs)/practice/coordinate-quiz/setup"
    >
      {/* The one module scored on points rather than correct-out-of-total,
          so only the headline differs from the other result screens. */}
      <PracticeStatsResultCard
        result={result}
        score={{
          label: t("coordinateQuiz.result.points"),
          value: String(points),
        }}
      />
    </PracticeResultScreen>
  );
}
