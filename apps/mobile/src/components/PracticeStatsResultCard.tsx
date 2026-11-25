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
   * Replaces the headline (correct out of total by default) for a module
   * scored on something else — the coordinate quiz, scored on points. The
   * stat grid below it stays the shared one.
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
  // stat's wording in some language.
  const stats = hideAverageTime
    ? allStats.filter((stat) => stat.key !== "averageTime")
    : allStats;

  return (
    <PracticeResultCard
      scoreLabel={score?.label ?? t("practiceResult.correctAnswers")}
      scoreValue={score?.value ?? scoreValue}
      statItems={stats}
    />
  );
}
