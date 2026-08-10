import { useTranslation } from "react-i18next";
import { deriveResultStats } from "@blindfold-chess/features/common";
import { PracticeResultCard } from "../../../components";
import type { QuizResult } from "../lib/types";

type ResultCardProps = {
  result: QuizResult;
};

export function ResultCard({ result }: ResultCardProps) {
  const { t } = useTranslation();

  const { stats } = deriveResultStats(result, {
    correctAnswers: t("coordinateQuiz.result.correctAnswers"),
    accuracy: t("coordinateQuiz.result.accuracy"),
    timeTaken: t("coordinateQuiz.result.timeTaken"),
    averageTime: t("coordinateQuiz.result.averageTime"),
  });

  // Not `PracticeStatsResultCard`: this is the one module scored on points
  // rather than correct-out-of-total, so the headline number does not come
  // from `deriveResultStats`. Only the stat grid below it is shared.
  return (
    <PracticeResultCard
      scoreLabel={t("coordinateQuiz.result.points")}
      scoreValue={String(result.points)}
      statItems={stats}
    />
  );
}
