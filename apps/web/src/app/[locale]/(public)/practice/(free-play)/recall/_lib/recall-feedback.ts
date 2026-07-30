import { formatMoveNumberPrefix } from './recall-format';

/** The structured move result `useRecallActions` reports for the last submission. */
export type RecallMoveFeedback = {
  type: 'correct' | 'incorrect' | 'skipped';
  moveNumber: number;
  isWhiteMove: boolean;
  move: string;
};

type Translate = (key: string, values: Record<string, string>) => string;

/**
 * The i18n key each feedback type renders with. Keyed on the type rather than
 * branched on inline so a new feedback type is a compile error here (an
 * exhaustive Record) instead of a silent fallthrough to "correct".
 */
const MESSAGE_KEYS: Record<RecallMoveFeedback['type'], string> = {
  correct: 'correctMoveMessage',
  incorrect: 'incorrectMoveError',
  skipped: 'skippedMoveMessage',
};

/**
 * Localized sentence for a move result, e.g. "12... Nf3 was wrong".
 *
 * Pure so it can be tested without mounting the recall session; the caller
 * supplies the translator, keeping this free of `next-intl`.
 */
export function formatRecallFeedbackMessage(feedback: RecallMoveFeedback, t: Translate): string {
  return t(MESSAGE_KEYS[feedback.type], {
    movePrefix: formatMoveNumberPrefix(feedback.moveNumber, feedback.isWhiteMove),
    move: feedback.move,
  });
}

/**
 * The page-title form of a move result: the message from
 * {@link formatRecallFeedbackMessage}, prefixed with a warning glyph when the
 * move was wrong — matching how the play screen surfaces its "invalid move"
 * title. Takes the already-formatted message so a caller that shows both the
 * inline sentence and the title formats it once.
 */
export function toRecallFeedbackTitleText(
  type: RecallMoveFeedback['type'],
  message: string
): string {
  return type === 'incorrect' ? `⚠ ${message}` : message;
}
