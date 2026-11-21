import { useTranslation } from "react-i18next";
import { useLocalSearchParams } from "expo-router";

import {
  PracticeResultScreen,
  PracticeStatsResultCard,
} from "../../../../components";
import { ChallengeRecordStatus } from "../../../../features/challenge/ChallengeRecordStatus";
import { parsePracticeStatsParams } from "../../../../lib/practice-result-params";
import type { PracticeStatsParams } from "../../../../lib/practice-result-params";

export default function DiagonalQuizResult() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<
    PracticeStatsParams & { attemptId?: string }
  >();
  const result = parsePracticeStatsParams(params);

  return (
    <PracticeResultScreen
      playAgainLabel={t("diagonalQuiz.result.playAgain")}
      backToMenuLabel={t("diagonalQuiz.result.backToMenu")}
      setupHref="/practice/diagonal-quiz"
    >
      <PracticeStatsResultCard result={result} />
      <ChallengeRecordStatus attemptId={params.attemptId} />
    </PracticeResultScreen>
  );
}
