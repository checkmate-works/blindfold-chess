import type { TFunction } from "i18next";
import type { RankJourney } from "@blindfold-chess/features/dojo-journey";

/** How many of a practice's challenges on one rank have been tried. */
export type PracticeProgress = {
  readonly done: number;
  readonly total: number;
};

/**
 * How far the player is through `menuType`'s part of a rank's practice
 * stage: its practice steps in `journey`, done and total.
 *
 * @description
 * The count is taken from the journey's practice steps and nothing else —
 * the same steps the rank card's "Practice n / N" counts. The practice row
 * exists so a player sent here by "Practice 1 / 3" can see which challenge
 * is the one left; counted any other way (from best scores, say), the row
 * and the card would show numbers that disagree. One practice can own
 * several steps: legal moves has one challenge per piece on 4kyu (king,
 * knight, bishop), so it reads "n / N", while a practice with a single
 * challenge is simply tried or not.
 *
 * Undefined when the rank asks for no challenge of the practice (an exam
 * problem only, or not at all), so the row shows nothing.
 */
export function practiceProgress(
  journey: RankJourney,
  menuType: string,
): PracticeProgress | undefined {
  const steps = journey.steps.filter(
    (step) => step.kind === "challenge" && step.menuType === menuType,
  );
  if (steps.length === 0) return undefined;
  return {
    done: steps.filter((step) => step.done).length,
    total: steps.length,
  };
}

/** What a practice row shows for its progress, and how it is read out. */
export type PracticeProgressLabel = {
  readonly value: string;
  readonly accessibilityLabel: string;
};

/**
 * A single challenge shows a check once tried and nothing before; several
 * show "n / N" from the start. Read out as "Tried" / "Tried n / N" rather
 * than the bare glyph or numbers.
 */
export function practiceProgressLabel(
  progress: PracticeProgress | undefined,
  t: TFunction,
): PracticeProgressLabel | undefined {
  if (progress === undefined) return undefined;
  const { done, total } = progress;
  if (total === 1) {
    return done >= 1
      ? { value: "✓", accessibilityLabel: t("practice.tried") }
      : undefined;
  }
  return {
    value: t("dojo.rankProgress", { done, total }),
    accessibilityLabel: t("practice.triedCount", { done, total }),
  };
}
