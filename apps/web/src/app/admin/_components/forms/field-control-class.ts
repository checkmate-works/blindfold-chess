/**
 * Shared className builder for the form controls ({@link Input},
 * {@link Textarea}, {@link Select}) so their styling stays identical.
 *
 * Two layout axes are intentionally NOT baked into a single hard-coded string,
 * because admin form controls live in two different contexts:
 *
 * - `surface` — the control's background must *contrast* with its container.
 *   Forms sit on a `bg-card` panel, so their fields use `bg-background`
 *   (recessed). Filter bars sit on the `bg-background` page area, so their
 *   controls use `bg-card` (raised) to avoid blending into the page. Default
 *   is `background` (the common form-field case).
 * - `fullWidth` — stacked form fields span the form (`w-full`); inline filter
 *   controls size to their content. Default is `true` (the form-field case).
 *
 * `invalid` is the third, orthogonal axis: it swaps the resting border for the
 * error one so a rejected field is visible as well as described. Pair it with
 * `Field`'s `error` prop — colour alone is not a message.
 */
export type FieldControlOptions = {
  surface?: 'background' | 'card';
  fullWidth?: boolean;
  invalid?: boolean;
};

export function fieldControlClass({
  surface = 'background',
  fullWidth = true,
  invalid = false,
  className,
}: FieldControlOptions & { className?: string }): string {
  return [
    fullWidth ? 'w-full' : null,
    'px-3 py-2 border rounded text-foreground text-sm',
    invalid ? 'border-destructive' : 'border-border',
    surface === 'card' ? 'bg-card' : 'bg-background',
    className,
  ]
    .filter(Boolean)
    .join(' ');
}
