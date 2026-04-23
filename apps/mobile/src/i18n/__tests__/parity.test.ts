import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

/**
 * Key-parity guard for mobile locale JSONs under `../resources/`.
 *
 * Every locale is expected to carry the identical key set as the reference
 * locale (`en`). Drift — even a single missing or stray key — is a common
 * cause of `undefined` strings leaking into the UI at runtime.
 *
 * Unlike the web parity test, mobile has no `parity-baseline.json`: the
 * mobile locale set was initialised with all four files in lockstep, so
 * there is no legacy drift to snapshot. Any divergence fails the test.
 *
 * Plain objects only — arrays and primitives are treated as leaf values.
 */

const REFERENCE_LOCALE = "en";
const RESOURCES_DIR = join(__dirname, "..", "resources");

function collectKeys(value: unknown, prefix = ""): string[] {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
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
  const filePath = join(RESOURCES_DIR, `${locale}.json`);
  const raw = readFileSync(filePath, "utf-8");
  return JSON.parse(raw) as Record<string, unknown>;
}

function discoverLocales(): string[] {
  return readdirSync(RESOURCES_DIR)
    .filter((name) => name.endsWith(".json"))
    .map((name) => name.slice(0, -".json".length))
    .sort();
}

describe("mobile i18n message key parity", () => {
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

      const missing = [...referenceKeys]
        .filter((k) => !candidateKeys.has(k))
        .sort();
      const extra = [...candidateKeys]
        .filter((k) => !referenceKeys.has(k))
        .sort();

      expect(
        missing,
        missing.length === 0
          ? ""
          : `${locale}.json is missing key(s): ${JSON.stringify(missing)}`,
      ).toEqual([]);

      expect(
        extra,
        extra.length === 0
          ? ""
          : `${locale}.json has extra key(s) not in ${REFERENCE_LOCALE}.json: ${JSON.stringify(extra)}`,
      ).toEqual([]);
    });
  }
});
