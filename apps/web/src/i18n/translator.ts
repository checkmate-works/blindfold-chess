import type { useTranslations } from 'next-intl';
import type { getTranslations } from 'next-intl/server';

/**
 * The `t` function a Client Component gets from `useTranslations`, for modules
 * that take it as a parameter rather than calling the hook themselves.
 *
 * Spelled once because `ReturnType<typeof useTranslations>` is not obviously
 * the same type as the next writer's guess at it: the `t` next-intl returns
 * also carries `rich`, `markup`, `raw` and `has`, and a narrower hand-written
 * signature silently forbids a callee from ever reaching them.
 */
export type ClientTranslator = ReturnType<typeof useTranslations>;

/**
 * The awaited `t` function a Server Component gets from `getTranslations`.
 *
 * Structurally the same shape as {@link ClientTranslator}, kept as its own name
 * because the two are obtained differently and a module that takes one is
 * declaring which side of the boundary it runs on.
 */
export type ServerTranslator = Awaited<ReturnType<typeof getTranslations>>;

/**
 * The narrow, hand-written translator shape: callable with a key and optional
 * interpolation values, and nothing else.
 *
 * Prefer {@link ClientTranslator} / {@link ServerTranslator} for anything that
 * merely passes a `t` through — they carry `rich`, `markup`, `raw` and `has`,
 * and narrowing needlessly forbids a callee from ever reaching them.
 *
 * This exists for the other case: a pure module that takes a translator as a
 * parameter and is unit-tested by handing it a plain `(key, values) => string`
 * fake. Widening those to the full next-intl type would make every such fake
 * implement four methods it never exercises, which is a real cost paid for no
 * benefit. Both of the full types are assignable to this one, and a fake that
 * ignores the second parameter is assignable too, so callers on either side
 * need no adaptation.
 *
 * Spelled here rather than per-module because it had been written out nine
 * times across the app under three different names.
 */
export type InterpolatingTranslator = (
  key: string,
  values?: Record<string, string | number | Date>
) => string;

/**
 * {@link InterpolatingTranslator} plus `has`, for resolvers that must ask
 * whether a key exists before rendering it — the "is this error code one we
 * have copy for, or a raw token to show verbatim?" question.
 */
export type TranslatorWithHas = InterpolatingTranslator & {
  has: (key: string) => boolean;
};
