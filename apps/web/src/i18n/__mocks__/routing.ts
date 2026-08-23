import { type ReactNode, createElement } from 'react';

import { vi } from 'vitest';

type LinkProps = {
  children: ReactNode;
  href: string;
  locale?: string;
} & Record<string, unknown>;

/**
 * The locale-aware `Link`, rendered as a plain anchor.
 *
 * Opt in with a bare `vi.mock('@/i18n/routing')`.
 *
 * `Link` is a Client Component wired to the locale-prefixed router, which does
 * not exist under jsdom, so any test that renders a card, a nav or a feed row
 * has to replace it. What those tests actually want is for `href` to reach the
 * DOM so they can assert on it, and sixteen of them wrote the same anchor —
 * differing only in how much of the prop type they bothered to spell out.
 *
 * `locale` is destructured away rather than spread: it is a `Link` prop, not an
 * HTML attribute, and React warns about it on a bare `<a>`.
 *
 * Written with `createElement` rather than JSX so this file can keep the `.ts`
 * extension — Vitest looks for `__mocks__/<basename>` matching the module it is
 * replacing, and `routing.tsx` is not found for `routing.ts`.
 *
 * Tests that need `useRouter` keep their own factory — what it should return is
 * per-test, the same reason `__mocks__/next/navigation.ts` leaves the router
 * hooks alone.
 */
export const Link = vi.fn(({ children, href, locale: _locale, ...props }: LinkProps) =>
  createElement('a', { href, ...props }, children)
);
