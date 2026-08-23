import { vi } from 'vitest';

/**
 * `next-intl`'s client hooks, stubbed to echo the key back.
 *
 * Opt in with a bare `vi.mock('next-intl')`.
 *
 * A test that renders a component only to assert on its behaviour still has to
 * get past the translator, and the cheapest translator that works is one that
 * returns the key. Fourteen files wrote `useTranslations: () => (key) => key`
 * byte-for-byte, and three more stubbed `useLocale` alone; this is the union of
 * the two, which is a superset of what each of them declared.
 *
 * Queries against the returned `t` resolve as "the key exists" — `has` returns
 * true and `rich` / `markup` / `raw` echo the key — so a component that asks
 * before rendering takes the same branch it takes in production.
 *
 * Tests whose subject IS the copy keep their own factory: a key -> text map, or
 * a `has` that answers false for a specific key, is the specification of the
 * component under test and says something a shared default cannot.
 */
const echo = (key: string) => key;

export const useTranslations = vi.fn(() =>
  Object.assign(echo, {
    rich: echo,
    markup: echo,
    raw: echo,
    has: () => true,
  })
);

export const useLocale = vi.fn(() => 'en');
