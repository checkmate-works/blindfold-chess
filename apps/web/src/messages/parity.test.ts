import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

/**
 * Key-parity guard for the locale message files in this directory.
 *
 * Every locale JSON is expected to carry the identical key set as the
 * reference locale (`en`), including all nested namespaces. Drift between
 * locale files — even a single missing or stray key — is a common cause of
 * `undefined` strings leaking into the UI at runtime, so we enforce parity
 * structurally here rather than hoping manual review catches it.
 *
 * The test is intentionally plain: read each JSON with `fs`, enumerate keys
 * recursively, and compute the symmetric difference against `en`. Plain
 * objects only — arrays and primitives are treated as leaf values, mirroring
 * how `next-intl` treats them.
 */

const REFERENCE_LOCALE = 'en';
const MESSAGES_DIR = __dirname;

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
    .filter((name) => name.endsWith('.json'))
    .map((name) => name.slice(0, -'.json'.length))
    .sort();
}

describe('i18n message key parity', () => {
  const locales = discoverLocales();
  const referenceKeys = new Set(collectKeys(loadLocale(REFERENCE_LOCALE)));

  it(`discovers the reference locale (${REFERENCE_LOCALE}) and at least one other`, () => {
    expect(locales).toContain(REFERENCE_LOCALE);
    expect(locales.length).toBeGreaterThan(1);
  });

  for (const locale of locales) {
    if (locale === REFERENCE_LOCALE) continue;

    it(`${locale}.json has the same key set as ${REFERENCE_LOCALE}.json`, () => {
      const candidateKeys = new Set(collectKeys(loadLocale(locale)));

      const missingInCandidate = [...referenceKeys].filter((k) => !candidateKeys.has(k)).sort();
      const extraInCandidate = [...candidateKeys].filter((k) => !referenceKeys.has(k)).sort();

      expect({
        [`missing_in_${locale}`]: missingInCandidate,
        [`extra_in_${locale}`]: extraInCandidate,
      }).toEqual({
        [`missing_in_${locale}`]: [],
        [`extra_in_${locale}`]: [],
      });
    });
  }
});
