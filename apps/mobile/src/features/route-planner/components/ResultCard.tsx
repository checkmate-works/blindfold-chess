import { useTranslation } from "react-i18next";
import { PracticeResultCard } from "../../../components";
import type { RoutePlannerResult } from "../hooks";

type ResultCardProps = {
  result: RoutePlannerResult;
};

export function ResultCard({ result }: ResultCardProps) {
  const { t } = useTranslation();

  return (
    <PracticeResultCard
      scoreLabel={t("routePlanner.result.score")}
      scoreValue={`${result.correctCount} / ${result.totalProblems}`}
      statItems={[
        {
          label: t("routePlanner.result.correct"),
          value: String(result.correctCount),
          highlight: true,
        },
        {
          label: t("routePlanner.result.accuracy"),
          value: `${result.accuracy.toFixed(1)}%`,
        },
      ]}
    />
  );
}
