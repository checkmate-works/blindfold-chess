import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { NON_LOCALE_TOP_SEGMENTS, needsLocalePrefix } from './locale-path';

describe('needsLocalePrefix', () => {
  it('completes a locale-less in-app path', () => {
    // The exact path that shipped as a production 404 via `CardLink`.
    expect(needsLocalePrefix('/games/new/standard')).toBe(true);
    expect(needsLocalePrefix('/practice')).toBe(true);
    expect(needsLocalePrefix('/dojo/ranks/5kyu')).toBe(true);
  });

  it('leaves the bare root alone so the landing page keeps serving all languages', () => {
    expect(needsLocalePrefix('/')).toBe(false);
  });

  it('leaves already-localized paths alone', () => {
    expect(needsLocalePrefix('/en')).toBe(false);
    expect(needsLocalePrefix('/ja/games/new')).toBe(false);
    expect(needsLocalePrefix('/pt-BR/dojo/ranks')).toBe(false);
  });

  it('leaves a mis-cased locale alone rather than redirecting to a nonsense target', () => {
    // Still a 404, exactly as before this redirect existed — the alternative
    // would be `/en/PT-BR/games`, which is strictly worse.
    expect(needsLocalePrefix('/pt-br/games')).toBe(false);
    expect(needsLocalePrefix('/EN/games')).toBe(false);
  });

  it.each(NON_LOCALE_TOP_SEGMENTS)('leaves the non-localized /%s namespace alone', (segment) => {
    expect(needsLocalePrefix(`/${segment}`)).toBe(false);
    expect(needsLocalePrefix(`/${segment}/anything/deeper`)).toBe(false);
  });

  it('leaves root-level public files alone', () => {
    // The Search Console ownership file: `.html` is NOT in the proxy matcher's
    // extension allowlist, so this reaches `needsLocalePrefix` and would be
    // redirected into a 404 — unverifying the property — without the dot check.
    const verificationFile = readdirSync(join(__dirname, '..', '..', 'public')).find(
      (name) => name.startsWith('google') && name.endsWith('.html')
    );
    expect(verificationFile, 'Search Console verification file moved or was removed').toBeDefined();
    expect(needsLocalePrefix(`/${verificationFile}`)).toBe(false);

    expect(needsLocalePrefix('/ads.txt')).toBe(false);
    expect(needsLocalePrefix('/stockfish.wasm')).toBe(false);
  });

  it('does not choke on a doubled leading slash', () => {
    expect(needsLocalePrefix('//games')).toBe(false);
  });
});

describe('NON_LOCALE_TOP_SEGMENTS', () => {
  it('covers every route-producing top-level directory outside [locale]', () => {
    const appDir = join(__dirname, '..', 'app');
    const actual = readdirSync(appDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      // `[locale]` is the localized tree this redirect exists to feed.
      .filter((name) => name !== '[locale]')
      // `_private` folders are excluded from routing by Next.js, and route
      // groups `(like-this)` contribute no URL segment — `(landing)` is how
      // the bare `/` is served, which `needsLocalePrefix` handles explicitly.
      .filter((name) => !name.startsWith('_') && !name.startsWith('('))
      .sort();

    expect(actual).toEqual([...NON_LOCALE_TOP_SEGMENTS].sort());
  });
});
