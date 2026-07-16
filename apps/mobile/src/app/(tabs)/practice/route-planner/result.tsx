import { useTranslation } from "react-i18next";
import { useLocalSearchParams } from "expo-router";

import { PracticeResultScreen } from "../../../../components";
import { ResultCard } from "../../../../features/route-planner/components";
import type { RoutePlannerResult } from "../../../../features/route-planner/hooks";

export default function RoutePlannerResultScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{
    correctCount: string;
    totalProblems: string;
    accuracy: string;
  }>();

  const result: RoutePlannerResult = {
    problems: [],
    correctCount: parseInt(params.correctCount || "0", 10),
    totalProblems: parseInt(params.totalProblems || "0", 10),
    accuracy: parseFloat(params.accuracy || "0"),
  };

  return (
    <PracticeResultScreen
      title={t("routePlanner.result.title")}
      playAgainLabel={t("routePlanner.result.playAgain")}
      backToMenuLabel={t("routePlanner.result.backToMenu")}
      setupHref="/(tabs)/practice/route-planner/setup"
    >
      <ResultCard result={result} />
    </PracticeResultScreen>
  );
}
