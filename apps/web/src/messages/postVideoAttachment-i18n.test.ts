import { describe, expect, it } from 'vitest';

import en from './en.json';
import es from './es.json';
import ja from './ja.json';
import ptBR from './pt-BR.json';

/**
 * Focused parity / completeness pin for `postVideoAttachment.error.*`
 * (issue #75).
 *
 * The repo-wide `parity.test.ts` already enforces that every locale
 * carries the same key set as `en` (and tracks deferred drift via a
 * baseline). This file is a *direct* pin on the `postVideoAttachment`
 * namespace so a regression specific to the video attachment flow
 * surfaces in a clearly-named test, rather than buried inside a
 * 600-line repo-wide diff. It also pins:
 *
 *   - The exact set of `error.*` keys consumed by `attachPostVideo`'s
 *     `reasonToErrorKey` mapping AND the action-level error keys
 *     (`urlRequired` / `tooLong` / `alreadyAttached` /
 *     `invalidVideoStructure` / `postNotFound` / `notOwner`).
 *   - That every locale carries every key with a non-empty string
 *     value (no `null` / `''` / unsubstituted ICU placeholders).
 *   - That no extra/legacy keys leaked into one locale only.
 */

const LOCALES = { en, ja, es, 'pt-BR': ptBR } as const;

// The full set of error keys the action can emit. Must stay aligned
// with `reasonToErrorKey` in attachPostVideo.ts and the action-level
// short-circuit error returns.
const EXPECTED_ERROR_KEYS = [
  // action-level pre-checks
  'urlRequired',
  'inputTooLong',
  'postNotFound',
  'notOwner',
  // parser reason → error key mapping (every YouTubeUrlReason)
  'invalidUrl',
  'protocolNotHttps',
  'userinfoPresent',
  'fragmentNotAllowed',
  'hostNotAllowed',
  'pathnameNotSupported',
  'paramPollution',
  'invalidId',
  // DB SQLSTATE mapping
  'invalidVideoStructure',
  'tooLong',
  'alreadyAttached',
] as const;

type LocaleSlug = keyof typeof LOCALES;
type ErrorBag = Record<string, unknown>;

function getErrorBag(slug: LocaleSlug): ErrorBag {
  const dict = LOCALES[slug] as Record<string, unknown>;
  const ns = dict.postVideoAttachment as Record<string, unknown> | undefined;
  if (!ns || typeof ns !== 'object') {
    throw new Error(`${slug}.json missing postVideoAttachment namespace`);
  }
  const errors = ns.error;
  if (!errors || typeof errors !== 'object' || Array.isArray(errors)) {
    throw new Error(`${slug}.json missing postVideoAttachment.error sub-object`);
  }
  return errors as ErrorBag;
}

describe('postVideoAttachment.error.* — locale completeness (issue #75)', () => {
  for (const slug of Object.keys(LOCALES) as LocaleSlug[]) {
    it(`${slug}.json carries every expected error key`, () => {
      const bag = getErrorBag(slug);
      const present = Object.keys(bag).sort();
      const expected = [...EXPECTED_ERROR_KEYS].sort();
      // Strict set equality: missing keys break the UI, extra keys are
      // dead code (and create silent confusion when a refactor touches
      // the action's error space).
      expect(present).toEqual(expected);
    });

    it(`${slug}.json has every error value as a non-empty string`, () => {
      const bag = getErrorBag(slug);
      for (const key of EXPECTED_ERROR_KEYS) {
        const v = bag[key];
        expect(typeof v, `${slug}: ${key} is not a string`).toBe('string');
        expect((v as string).length, `${slug}: ${key} is empty`).toBeGreaterThan(0);
        // Catch unsubstituted ICU placeholders (`{somePlaceholder}`)
        // that snuck into the message — the action does not pass any
        // ICU values, so any literal `{...}` is a translator typo.
        expect(
          (v as string).match(/\{[a-zA-Z]+\}/),
          `${slug}: ${key} contains a literal {placeholder}`
        ).toBeNull();
      }
    });
  }
});

describe('postVideoAttachment.error.* — cross-locale key set parity', () => {
  it('every locale carries the identical set of postVideoAttachment.error.* keys', () => {
    const slugs = Object.keys(LOCALES) as LocaleSlug[];
    const sets = slugs.map((slug) => Object.keys(getErrorBag(slug)).sort());
    // All locales must agree byte-for-byte on the key set.
    for (let i = 1; i < sets.length; i += 1) {
      expect(sets[i], `${slugs[i]}.json key set differs from ${slugs[0]}.json`).toEqual(sets[0]);
    }
  });
});
