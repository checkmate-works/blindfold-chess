import { formatMoveAnchor } from "@blindfold-chess/features/chess-core/move-numbering";

import type { RecallFeedback } from "../recall-state";

type Translate = (key: string, values: Record<string, string>) => string;

/**
 * The web's `formatRecallFeedbackMessage` + `toRecallFeedbackTitleText`: the
 * latest move's result as one line ("12... is not Nf3", "12... Nxe5 is
 * correct", "The answer was 12... Nxe5"), with a warning sign on a wrong
 * move. The web shows it as the page title; the app shows it as the
 * session header's title.
 */
export function recallFeedbackTitle(
  feedback: RecallFeedback,
  t: Translate,
): string {
  const values = {
    movePrefix: formatMoveAnchor(feedback.moveNumber, feedback.isWhiteMove),
    move: feedback.move,
  };
  switch (feedback.type) {
    case "correct":
      return t("recall.correctMoveMessage", values);
    case "skipped":
      return t("recall.skippedMoveMessage", values);
    case "incorrect":
      return `⚠ ${t("recall.incorrectMoveError", values)}`;
  }
}
