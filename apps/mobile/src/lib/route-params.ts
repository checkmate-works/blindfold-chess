/**
 * Validated parsing for deep-link search params.
 *
 * Expo Router delivers search params as arbitrary strings. Casting them
 * straight to a union type (`params.skillLevel as SkillLevel`) lets junk deep
 * links flow into session hooks as impossible values — `?skillLevel=abc`
 * parsed to `NaN` yet typed as a valid level. These helpers confine the
 * unavoidable widening to a single membership-checked place.
 */

/** `value` when it is one of `allowed`, otherwise `fallback`. */
export function parseEnumParam<T extends string>(
  value: string | undefined,
  allowed: readonly T[],
  fallback: T,
): T {
  return value !== undefined && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

/** Integer parse with a lower bound; `fallback` on junk (NaN never escapes). */
export function parseIntParam(
  value: string | undefined,
  { min = 0, fallback }: { min?: number; fallback: number },
): number {
  const parsed = value !== undefined ? Number(value) : NaN;
  return Number.isInteger(parsed) && parsed >= min ? parsed : fallback;
}

/** Numeric counterpart of {@link parseEnumParam} for number-literal unions. */
export function parseNumberEnumParam<T extends number>(
  value: string | undefined,
  allowed: readonly T[],
  fallback: T,
): T {
  const parsed = value !== undefined ? Number(value) : NaN;
  return (allowed as readonly number[]).includes(parsed)
    ? (parsed as T)
    : fallback;
}

/**
 * Comma-separated list narrowed to `allowed` members; `fallback` when the
 * param is absent or nothing valid remains after filtering.
 */
export function parseEnumListParam<T extends string>(
  value: string | undefined,
  allowed: readonly T[],
  fallback: readonly T[],
): T[] {
  const parsed = (value ?? "")
    .split(",")
    .filter((item): item is T => (allowed as readonly string[]).includes(item));
  return parsed.length > 0 ? parsed : [...fallback];
}
