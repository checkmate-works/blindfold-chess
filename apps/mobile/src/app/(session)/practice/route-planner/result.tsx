import { useTranslation } from "react-i18next";
import { useLocalSearchParams } from "expo-router";

import { PracticeResultScreen } from "../../../../components";
import { ChallengeRecordStatus } from "../../../../features/challenge/ChallengeRecordStatus";
import { ResultCard } from "../../../../features/route-planner/components";
import type { RoutePlannerResult } from "../../../../features/route-planner/hooks";

export default function RoutePlannerResultScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{
    correctCount: string;
    totalProblems: string;
    accuracy: string;
    attemptId?: string;
  }>();

  const result: RoutePlannerResult = {
    problems: [],
    correctCount: parseInt(params.correctCount || "0", 10),
    totalProblems: parseInt(params.totalProblems || "0", 10),
    accuracy: parseFloat(params.accuracy || "0"),
  };

  return (
    <PracticeResultScreen
      playAgainLabel={t("routePlanner.result.playAgain")}
      backToMenuLabel={t("routePlanner.result.backToMenu")}
      setupHref="/practice/route-planner"
    >
      <ResultCard result={result} />
      <ChallengeRecordStatus attemptId={params.attemptId} />
    </PracticeResultScreen>
  );
}
