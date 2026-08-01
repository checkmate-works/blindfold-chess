export const INPUT_BASE_CLASSES =
  'w-full px-4 py-3 bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent';

export const INPUT_SM_CLASSES =
  'w-full px-3 py-2 bg-card border border-border rounded-lg text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50';

export type InputSize = 'md' | 'sm';

/**
 * Swap a control's resting border for the error one.
 *
 * A replace rather than an append because both classes are the same Tailwind
 * utility (`border-color`): appending `border-destructive` next to
 * `border-border` leaves which one wins up to the order they happen to sit in
 * the generated stylesheet, not the order of the class attribute. Controls
 * that build their own class string have no resting border colour baked in and
 * use `fieldBorderClass` instead.
 */
export function invalidBorderClasses(classes: string, invalid: boolean): string {
  return invalid ? classes.replace('border-border', 'border-destructive') : classes;
}
