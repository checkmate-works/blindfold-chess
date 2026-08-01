import type { RepertoireLineEditError, RepertoireValidationError } from './validation';

/**
 * The controls a repertoire form can anchor a rejected submit on. Not every
 * form renders every one of them — see {@link repertoireErrorField}.
 */
export type RepertoireFormField = 'name' | 'description' | 'moves' | 'chapter';

/**
 * Every error one of these rejections can be blamed on. A superset of the
 * validators' unions: the mutations add their own guard failures on top
 * (`unauthorized`, `notFound`, `invalidChapter`, …), and those are exactly the
 * ones no single control owns.
 */
type RepertoireFormError =
  RepertoireValidationError | RepertoireLineEditError | 'descriptionTooLong' | 'invalidChapter';

/**
 * Which control is at fault for each rejection. Anything absent here — an
 * auth guard, a rate limit, an insufficient balance, a `notFound` — belongs to
 * no control and stays in the form-level banner (see `FormErrorBanner`).
 *
 * `invalidSide` / `invalidPhase` / `invalidVisibility` are deliberately absent
 * too: those controls are radio groups whose options are all valid, so the
 * rejection means a bad client rather than something the author can see and
 * fix at the control. It reads as a server failure, and is reported as one.
 *
 * The `satisfies` clause is the guard that keeps this in sync with the
 * validators: a key misspelled, or one whose error the union drops, fails to
 * compile.
 */
const FIELD_BY_ERROR = {
  nameRequired: 'name',
  nameTooLong: 'name',
  descriptionTooLong: 'description',
  pgnRequired: 'moves',
  pgnTooLarge: 'moves',
  invalidPgn: 'moves',
  noMoves: 'moves',
  // Notes and board markup are authored inside the moves editor, on the board.
  invalidAnnotations: 'moves',
  invalidChapter: 'chapter',
} satisfies Partial<Record<RepertoireFormError, RepertoireFormField>>;

/**
 * The control that owns `error` — or `null` when it owns none, and the message
 * belongs in the form-level banner instead.
 *
 * `rendered` names the controls the calling form actually has. An error mapped
 * to a control this form does not render (a line-only `invalidChapter` reaching
 * the import form, say) falls back to the banner: attaching it to a control
 * that never mounts would silently swallow the message, which is worse than the
 * banner it replaced.
 *
 * Deliberately a leaf module (both imports erase at compile time): the
 * consumers are client components, and importing `validation.ts` for a value
 * would pull chess.js into their bundles.
 */
export function repertoireErrorField(
  error: string,
  rendered: readonly RepertoireFormField[]
): RepertoireFormField | null {
  const field: RepertoireFormField | undefined =
    FIELD_BY_ERROR[error as keyof typeof FIELD_BY_ERROR];
  return field && rendered.includes(field) ? field : null;
}
