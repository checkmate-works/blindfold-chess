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
