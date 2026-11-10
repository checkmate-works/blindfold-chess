/**
 * A type guard for one stored settings field.
 */
export type FieldGuard<V> = (value: unknown) => value is V;

/**
 * Keep the fields of a parsed settings payload that pass their guard, and drop
 * the rest so the caller's defaults fill them in.
 *
 * Settings are stored as JSON by an earlier build of the app, so the payload is
 * whatever that build wrote: a field may hold an option that has since been
 * removed, or the whole value may be a non-object if the key was hand-edited.
 * Each field is judged on its own — one stale field must not cost the player
 * the others they chose. Fields without a guard are dropped, which also keeps
 * keys an older schema used from riding along into the next write.
 */
export function pickValidFields<T extends Record<string, unknown>>(
  parsed: unknown,
  guards: { [K in keyof T]: FieldGuard<T[K]> },
): Partial<T> {
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return {};
  }
  const source = parsed as Record<string, unknown>;
  const result: Partial<T> = {};
  for (const key of Object.keys(guards) as (keyof T & string)[]) {
    const value = source[key];
    if (guards[key](value)) result[key] = value;
  }
  return result;
}

/**
 * Guard for a field whose value must be one of a fixed list of literals.
 */
export function oneOf<const V extends string | number>(
  options: readonly V[],
): FieldGuard<V> {
  return (value: unknown): value is V =>
    (options as readonly unknown[]).includes(value);
}

/** Guard for a boolean field. */
export const isBoolean: FieldGuard<boolean> = (value): value is boolean =>
  typeof value === "boolean";

/** Guard for a string field. */
export const isString: FieldGuard<string> = (value): value is string =>
  typeof value === "string";

/** Guard for an integer field within `[min, max]`. */
export function integerBetween(min: number, max: number): FieldGuard<number> {
  return (value: unknown): value is number =>
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= min &&
    value <= max;
}
