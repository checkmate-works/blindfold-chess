/** The control a validation error belongs to. */
export type PositionFormField = 'fen' | 'title';

/** Translation keys under `practice.positionMemory.create`. */
export type PositionFormErrorKey = 'fenRequired' | 'positionInvalid' | 'titleRequired';

export type PositionFormError = { field: PositionFormField; key: PositionFormErrorKey };

/**
 * Submit gate shared by the create and edit position-memory forms.
 * Returns the first failing rule as a `{ field, key }` pair — the field is
 * what lets the message be rendered against the control at fault instead
 * of in a strip the author has to scroll back up to find — or null when
 * the form is submittable.
 *
 * Empty and malformed positions are distinguished because the fix differs:
 * one means "place some pieces", the other "that FEN is wrong".
 */
export function validatePositionForm(input: {
  trimmedFen: string;
  isFenValid: boolean;
  title: string;
}): PositionFormError | null {
  if (input.trimmedFen === '') return { field: 'fen', key: 'fenRequired' };
  if (!input.isFenValid) return { field: 'fen', key: 'positionInvalid' };
  if (input.title.trim() === '') return { field: 'title', key: 'titleRequired' };
  return null;
}
