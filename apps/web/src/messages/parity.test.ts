import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

import baseline from './parity-baseline.json';

/**
 * Key-parity guard for the locale message files in this directory.
 *
 * Every locale JSON is expected to carry the identical key set as the
 * reference locale (`en`), including all nested namespaces. Drift between
 * locale files — even a single missing or stray key — is a common cause of
 * `undefined` strings leaking into the UI at runtime, so we enforce parity
 * structurally here rather than hoping manual review catches it.
 *
 * Pre-existing drift (predating the translator catch-up track) is snapshotted
 * in `parity-baseline.json`. The test fails only on NEW drift relative to the
 * baseline, and additionally fails when a baseline entry becomes stale — i.e.
 * a translator closed a gap but did not shrink the baseline file. That keeps
 * the baseline honest and prevents it from silently growing permanent.
 *
 * Plain objects only — arrays and primitives are treated as leaf values,
 * mirroring how `next-intl` treats them.
 */

const REFERENCE_LOCALE = 'en';
const MESSAGES_DIR = __dirname;

type BaselineEntry = { missing: string[]; extra: string[] };
type Baseline = {
  reference_locale: string;
  locales: Record<string, BaselineEntry>;
};

const parityBaseline = baseline as unknown as Baseline;

function collectKeys(value: unknown, prefix = ''): string[] {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return [prefix];
  }
  const record = value as Record<string, unknown>;
  const keys: string[] = [];
  for (const [k, v] of Object.entries(record)) {
    const path = prefix ? `${prefix}.${k}` : k;
    keys.push(...collectKeys(v, path));
  }
  return keys;
}

function loadLocale(locale: string): Record<string, unknown> {
  const filePath = join(MESSAGES_DIR, `${locale}.json`);
  const raw = readFileSync(filePath, 'utf-8');
  return JSON.parse(raw) as Record<string, unknown>;
}

function discoverLocales(): string[] {
  return readdirSync(MESSAGES_DIR)
    .filter((name) => name.endsWith('.json') && name !== 'parity-baseline.json')
    .map((name) => name.slice(0, -'.json'.length))
    .sort();
}

function baselineFor(locale: string): BaselineEntry {
  return parityBaseline.locales[locale] ?? { missing: [], extra: [] };
}

describe('i18n message key parity', () => {
  const locales = discoverLocales();
  const referenceKeys = new Set(collectKeys(loadLocale(REFERENCE_LOCALE)));

  it(`discovers the reference locale (${REFERENCE_LOCALE}) and at least one other`, () => {
    expect(locales).toContain(REFERENCE_LOCALE);
    expect(locales.length).toBeGreaterThan(1);
  });

  it(`parity baseline references the same locale (${REFERENCE_LOCALE})`, () => {
    expect(parityBaseline.reference_locale).toBe(REFERENCE_LOCALE);
  });

  for (const locale of locales) {
    if (locale === REFERENCE_LOCALE) continue;

    it(`${locale}.json has no NEW drift beyond parity-baseline.json`, () => {
      const candidateKeys = new Set(collectKeys(loadLocale(locale)));

      const actualMissing = [...referenceKeys].filter((k) => !candidateKeys.has(k)).sort();
      const actualExtra = [...candidateKeys].filter((k) => !referenceKeys.has(k)).sort();

      const { missing: baselineMissing, extra: baselineExtra } = baselineFor(locale);
      const baselineMissingSet = new Set(baselineMissing);
      const baselineExtraSet = new Set(baselineExtra);
      const actualMissingSet = new Set(actualMissing);
      const actualExtraSet = new Set(actualExtra);

      // NEW drift: keys missing/extra right now that the baseline didn't predict.
      const newMissing = actualMissing.filter((k) => !baselineMissingSet.has(k));
      const newExtra = actualExtra.filter((k) => !baselineExtraSet.has(k));

      // Stale baseline: keys the baseline says are missing/extra but aren't anymore.
      // Good news (a translator filled a gap) — but the baseline must be shrunk
      // to reflect it, otherwise future regressions can hide behind stale entries.
      const regressedBaseline = baselineMissing.filter((k) => !actualMissingSet.has(k));
      const regressedBaselineExtra = baselineExtra.filter((k) => !actualExtraSet.has(k));

      expect(
        newMissing,
        newMissing.length === 0
          ? ''
          : `${locale}.json is missing new key(s) not listed in parity-baseline.json: ` +
              `${JSON.stringify(newMissing)}. ` +
              `Either add the translation to ${locale}.json, or if the gap is intentional ` +
              `and being deferred, add the key(s) to locales.${locale}.missing in parity-baseline.json.`
      ).toEqual([]);

      expect(
        newExtra,
        newExtra.length === 0
          ? ''
          : `${locale}.json has new extra key(s) not in ${REFERENCE_LOCALE}.json and not listed in parity-baseline.json: ` +
              `${JSON.stringify(newExtra)}. ` +
              `Either remove them from ${locale}.json (or add the matching key to ${REFERENCE_LOCALE}.json), ` +
              `or register them under locales.${locale}.extra in parity-baseline.json.`
      ).toEqual([]);

      expect(
        regressedBaseline,
        regressedBaseline.length === 0
          ? ''
          : `parity-baseline.json is stale: key(s) ${JSON.stringify(regressedBaseline)} ` +
              `are listed under locales.${locale}.missing but are now present in ${locale}.json. ` +
              `Please remove them from parity-baseline.json so the guard stays honest.`
      ).toEqual([]);

      expect(
        regressedBaselineExtra,
        regressedBaselineExtra.length === 0
          ? ''
          : `parity-baseline.json is stale: key(s) ${JSON.stringify(regressedBaselineExtra)} ` +
              `are listed under locales.${locale}.extra but are no longer extra in ${locale}.json. ` +
              `Please remove them from parity-baseline.json so the guard stays honest.`
      ).toEqual([]);
    });
  }
});
