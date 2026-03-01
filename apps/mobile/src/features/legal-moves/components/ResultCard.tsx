import { useTranslation } from "react-i18next";
import { PracticeResultCard } from "../../../components";
import type { LegalMovesResult } from "../hooks";

type ResultCardProps = {
  result: LegalMovesResult;
};

export function ResultCard({ result }: ResultCardProps) {
  const { t } = useTranslation();

  const statItems = [
    {
      label: t("legalMoves.result.correctAnswers"),
      value: result.correctAnswers.toString(),
      highlight: true,
    },
    {
      label: t("legalMoves.result.accuracy"),
      value: `${result.accuracy.toFixed(1)}%`,
    },
    {
      label: t("legalMoves.result.timeTaken"),
      value: `${result.timeTaken}s`,
    },
    {
      label: t("legalMoves.result.averageTime"),
      value: `${result.averageTime.toFixed(1)}s`,
    },
  ];

  return (
    <PracticeResultCard
      scoreLabel={t("legalMoves.result.correctAnswers")}
      scoreValue={`${result.correctAnswers} / ${result.totalQuestions}`}
      statItems={statItems}
    />
  );
}
