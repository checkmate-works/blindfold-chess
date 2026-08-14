import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';

import type { IntlScopeId } from '@/app/[locale]/_lib/i18n-scopes';
import { pickScopedMessages } from '@/app/[locale]/_lib/i18n-scopes';

/**
 * Nested next-intl provider serving one route subtree's dictionary.
 *
 * The root layout ships only `GLOBAL_CLIENT_NAMESPACES` (~10 KB); each heavy
 * subtree re-provides its own set from `INTL_SCOPES` here. next-intl's
 * provider REPLACES the parent dictionary for everything below it (no merge),
 * which is why the scope lists in `i18n-scopes.ts` are self-sufficient.
 *
 * Only `messages` is passed. Every other provider prop — `locale`,
 * `timeZone`, `onError`, `getMessageFallback` — is deliberately omitted so it
 * inherits from the root `IntlThemeShell` provider at runtime (`use-intl`
 * falls back to the parent context per prop). Passing e.g. `onError` here
 * would also be impossible: this is a Server Component and function props
 * don't serialize.
 *
 * `getMessages({ locale })` takes the locale explicitly, so this stays
 * static-generation-safe (no `headers()`/`cookies()` read — see the "No
 * dynamic-API reads in the shared [locale] tree" rule in CLAUDE.md), and
 * next-intl caches the loaded dictionary per request, so nested layouts add
 * no I/O over the root layout's own call.
 *
 * Subtrees whose layout is nothing but providers spell this out as a small
 * explicit component (see e.g. `(public)/chunks/layout.tsx`) rather than
 * going through a factory: `game-preferences-coverage.test.ts` verifies
 * provider coverage by scanning layout sources for the provider token, and
 * an explicit component keeps that scan — and grep — honest.
 */
export async function ScopedIntlProvider({
  scope,
  locale,
  children,
}: {
  scope: IntlScopeId;
  locale: string;
  children: React.ReactNode;
}) {
  const allMessages = await getMessages({ locale });
  return (
    <NextIntlClientProvider messages={pickScopedMessages(allMessages, scope)}>
      {children}
    </NextIntlClientProvider>
  );
}
