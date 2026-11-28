import { useTranslation } from "react-i18next";
import { deriveResultStats } from "@blindfold-chess/features/common";
import type { BasePracticeResult } from "@blindfold-chess/features/common";
import { PracticeResultCard } from "./PracticeResultCard";

type PracticeStatsResultCardProps = {
  result: BasePracticeResult;
  /**
   * Overrides the "time taken" stat label for features whose translation
   * diverges from the shared `practiceResult.timeTaken` string.
   */
  timeTakenLabel?: string;
  /**
   * The score of a module scored on something other than right answers —
   * the coordinate quiz's points — shown first in the stat grid under the
   * accuracy graph.
   */
  score?: { label: string; value: string };
  /**
   * Leaves the average time per answer out of the stat grid, for a module
   * whose web result does (quadrants).
   */
  hideAverageTime?: boolean;
};

export function PracticeStatsResultCard({
  result,
  timeTakenLabel,
  score,
  hideAverageTime = false,
}: PracticeStatsResultCardProps) {
  const { t } = useTranslation();

  const { scoreValue, stats: allStats } = deriveResultStats(result, {
    correctAnswers: t("practiceResult.correctAnswers"),
    accuracy: t("practiceResult.accuracy"),
    timeTaken: timeTakenLabel ?? t("practiceResult.timeTaken"),
    averageTime: t("practiceResult.averageTime"),
  });

  // By key, not label: the label is a translation and could match another
  // stat's wording in some language. The correct count and the accuracy are
  // the accuracy graph's summary, so the grid keeps only the times.
  const accuracyStat = allStats.find((stat) => stat.key === "accuracy");
  const timeStats = allStats.filter(
    (stat) =>
      stat.key !== "correctAnswers" &&
      stat.key !== "accuracy" &&
      !(hideAverageTime && stat.key === "averageTime"),
  );
  // A module scored on something else (the coordinate quiz's points) leads
  // the grid with that score, since the graph only counts right answers.
  const stats = score ? [score, ...timeStats] : timeStats;

  return (
    <PracticeResultCard
      scoreLabel={score?.label ?? t("practiceResult.correctAnswers")}
      scoreValue={score?.value ?? scoreValue}
      statItems={stats}
      accuracy={{
        correct: result.correctAnswers,
        total: result.totalQuestions,
        summary: `${scoreValue} · ${accuracyStat?.value ?? ""}`,
      }}
    />
  );
}
