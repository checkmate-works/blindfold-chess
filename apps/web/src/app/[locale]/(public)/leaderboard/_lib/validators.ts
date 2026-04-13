import type {
  LeaderboardModule,
  LeaderboardModuleSlug,
  LeaderboardPeriod,
  ModuleFilterValue,
} from './types';
import {
  MODULES,
  MODULE_KEYS,
  VALID_MODULE_FILTERS,
  VALID_MODULE_SLUGS,
  VALID_PERIODS,
} from './types';

export function isValidModule(value: string): value is LeaderboardModule {
  return (MODULES as readonly string[]).includes(value);
}

export function isValidPeriod(value: string): value is LeaderboardPeriod {
  return (VALID_PERIODS as readonly string[]).includes(value);
}

export function isValidKey(module: LeaderboardModule, key: string): boolean {
  return (MODULE_KEYS[module] as readonly string[]).includes(key);
}

export function isValidModuleFilter(value: string): value is ModuleFilterValue {
  return (VALID_MODULE_FILTERS as readonly string[]).includes(value);
}

/**
 * Check whether a string is a valid leaderboard module URL slug (hyphenated
 * form, e.g. `coordinate-quiz`). Used by the canonical middle hub route
 * `/leaderboard/score/[period]/[module-slug]` to 404 on unknown slugs.
 */
export function isValidModuleSlug(value: string): value is LeaderboardModuleSlug {
  return (VALID_MODULE_SLUGS as readonly string[]).includes(value);
}

export function isValidPage(page: number): boolean {
  return Number.isInteger(page) && page >= 1;
}

/**
 * Parse a raw period string into a `LeaderboardPeriod`, falling back to the
 * provided default (default `'all-time'`) for any invalid or missing value.
 *
 * This is intentionally lenient so `searchParams.period` style legacy inputs
 * can be normalized. Path-param routes that need strict 404 behavior should
 * call `isValidPeriod` directly instead.
 */
export function parsePeriod(
  value: string | undefined,
  fallback: LeaderboardPeriod = 'all-time'
): LeaderboardPeriod {
  if (value && isValidPeriod(value)) {
    return value;
  }
  return fallback;
}

/**
 * Lenient parser for the legacy `?module=` query param. Accepts the underscore
 * form (e.g. `coordinate_quiz`) and returns a `ModuleFilterValue` — `'all'`
 * when the input is missing, not a string, or invalid. Used by the legacy
 * `/leaderboard/[period]?module=...` shim to decide whether to redirect to a
 * category+module path segment or to the bare score top.
 */
export function parseModuleFilter(value: string | string[] | undefined): ModuleFilterValue {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw && isValidModuleFilter(raw)) {
    return raw;
  }
  return 'all';
}

/**
 * Lenient parser for a module URL slug segment. Accepts the hyphenated slug
 * form (e.g. `coordinate-quiz`) and returns the valid slug or `null`. Used by
 * the canonical middle hub route `/leaderboard/score/[period]/[module-slug]`
 * to decide whether to 404 on unknown segments.
 */
export function parseModuleSlugFilter(
  value: string | string[] | undefined
): LeaderboardModuleSlug | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw && isValidModuleSlug(raw)) {
    return raw;
  }
  return null;
}
