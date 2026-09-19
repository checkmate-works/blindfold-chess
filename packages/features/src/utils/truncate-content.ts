/**
 * Cut `content` down to a preview of at most `maxLength` characters, appending
 * an ellipsis when anything was actually removed.
 *
 * Three details of the contract used to differ between hand-rolled copies of
 * this function scattered across the list screens, so they are fixed here and
 * every caller inherits them:
 *
 * - **Boundary.** `maxLength` is the budget for the content, not for the
 *   result: a string of exactly `maxLength` characters comes back untouched,
 *   and only `maxLength + 1` and longer are cut. A truncated result is
 *   therefore `maxLength + 3` characters once the ellipsis is appended.
 * - **Trailing whitespace.** The cut is blind to word boundaries, so it often
 *   lands on a space. Without the `trimEnd()` the result reads `"foo ..."`,
 *   with a visible gap before the dots, while the neighbouring list rendered
 *   `"foo..."`. The trim applies only when a cut happened — a string short
 *   enough to keep is returned character-for-character, trailing spaces
 *   included.
 * - **Ellipsis.** ASCII `...`, three separate characters, never U+2026 `…`.
 *   Both forms were in use and the difference shows when two lists sit on one
 *   page; `...` is what the majority already rendered.
 *
 * `maxLength` counts UTF-16 code units, because that is what `String.slice`
 * operates on. A cut can land inside a surrogate pair or a combining sequence
 * and leave a lone half at the end of a preview; that is tolerated rather than
 * solved, since every caller feeds the result to a line-clamped block where
 * the last glyph is already visually cropped.
 *
 * Callers wanting a shorter preview pass `maxLength` explicitly instead of
 * re-implementing the cut, so the visible length stays a per-screen decision
 * while the three rules above stay shared.
 */
export function truncateContent(content: string, maxLength = 200): string {
  if (content.length <= maxLength) return content;
  return content.slice(0, maxLength).trimEnd() + "...";
}
