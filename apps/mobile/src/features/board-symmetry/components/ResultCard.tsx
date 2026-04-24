import { useTranslation } from "react-i18next";
import { deriveResultStats } from "@blindfold-chess/features/common";
import { PracticeResultCard } from "../../../components";
import type { BoardSymmetryResult } from "../hooks";

type ResultCardProps = {
  result: BoardSymmetryResult;
};

export function ResultCard({ result }: ResultCardProps) {
  const { t } = useTranslation();

  const { scoreValue, stats } = deriveResultStats(result, {
    correctAnswers: t("boardSymmetry.result.correctAnswers"),
    accuracy: t("boardSymmetry.result.accuracy"),
    timeTaken: t("boardSymmetry.result.timeTaken"),
    averageTime: t("boardSymmetry.result.averageTime"),
  });

  return (
    <PracticeResultCard
      scoreLabel={t("boardSymmetry.result.correctAnswers")}
      scoreValue={scoreValue}
      statItems={stats}
    />
  );
}
