import type { ReactNode } from 'react';

import type { Metadata } from 'next';
import { hasLocale } from 'next-intl';
import { getTranslations } from 'next-intl/server';

import { ScopedIntlProvider } from '@/app/_layouts/scoped-intl-layout';
import { routing } from '@/i18n/routing';

import { getOptionalUser } from '@/lib/auth';

import { PageTitle } from '@/app/[locale]/_components';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';

type Props = {
  children: ReactNode;
  params: Promise<{
    locale: string;
  }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  // Narrow route-segment `locale` (plain string) to the `Locale` union so the
  // metadata helpers can index their exhaustive `Record<Locale, _>` maps.
  const locale = hasLocale(routing.locales, rawLocale) ? rawLocale : routing.defaultLocale;
  const t = await getTranslations({ locale, namespace: 'metadata.leaderboard' });

  const title = t('title');
  const description = t('description');

  return {
    ...generateCanonicalMetadata({ locale, path: 'leaderboard', title, description }),
    title: resolveTitle(title, locale),
    description,
  };
}

/**
 * Auth-aware leaderboard layout.
 *
 * Awaits `getOptionalUser()` (cached via React `cache()` in `@/lib/auth`, so
 * the page's own call shares the same fetch) and exposes the result as a
 * `data-auth-state` attribute on the wrapper div. The per-route `loading.tsx`
 * skeletons render a SignUpBanner placeholder with `data-banner-placeholder`;
 * a small inline `<style>` rule below hides the placeholder when the layout
 * has already resolved to `authenticated`. This guarantees zero CLS for both
 * anonymous AND logged-in users: the placeholder only takes up space when
 * the real banner will end up rendering below.
 *
 * Why inline CSS and not Tailwind `group-data-[...]`: the project has zero
 * prior usage of `group-data-[...]` or arbitrary data-attribute variants, so
 * an inline `<style>` block is the lowest-risk way to guarantee the rule
 * actually fires. The rule is scoped to `[data-banner-placeholder]` so it
 * cannot accidentally affect other elements.
 */
export default async function LeaderboardLayout({ children, params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'leaderboard' });
  const user = await getOptionalUser();
  const authState: 'authenticated' | 'anonymous' = user ? 'authenticated' : 'anonymous';

  return (
    <ScopedIntlProvider scope="leaderboard" locale={locale}>
      <div className="space-y-8" data-auth-state={authState}>
        {/*
          Hide the SignUpBanner skeleton placeholder for logged-in users. The
          selector targets any `[data-banner-placeholder]` element nested under
          an ancestor whose `data-auth-state` is `authenticated`. Scoped inline
          so we don't leak styles outside this subtree.
        */}
        <style>{`[data-auth-state="authenticated"] [data-banner-placeholder]{display:none}`}</style>

        <PageTitle>{t('title')}</PageTitle>

        {children}
      </div>
    </ScopedIntlProvider>
  );
}
