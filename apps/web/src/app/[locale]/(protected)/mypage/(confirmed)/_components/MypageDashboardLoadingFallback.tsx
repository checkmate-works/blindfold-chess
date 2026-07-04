'use client';

import { useTranslations } from 'next-intl';

import { PagePanel, PageTitle } from '@/app/[locale]/_components';

import { MypageDashboardSkeleton } from './MypageDashboardSkeleton';

/**
 * Full loading shell for the `/mypage` dashboard (centered title + panel +
 * {@link MypageDashboardSkeleton}). Used by the `(protected)` layout's
 * route-aware auth-gate fallback so a hard load / refresh of (and the
 * post-sign-in landing on) the dashboard streams a matching skeleton.
 * PageTitle renders the real translated string rather than a bar placeholder,
 * matching the convention in articles/loading.tsx etc.
 *
 * Client Component (not an async Server Component calling `getTranslations`):
 * `resolveLoadingFallback` — which constructs this element — is imported from
 * both a Server Component (`(protected)/layout.tsx`) AND a Client Component
 * (`(protected)/loading.tsx`, which calls `usePathname()`). An async Server
 * Component reached only through the client-invoked path would be an invalid
 * RSC boundary crossing, so this reads the locale via the `useTranslations`
 * client hook (backed by `NextIntlClientProvider`, already covering the
 * `Mypage` namespace — see `_lib/i18n-namespaces.ts`) instead.
 */
export function MypageDashboardLoadingFallback() {
  const t = useTranslations('Mypage');

  return (
    <div className="space-y-8">
      <div className="mb-8">
        <PageTitle>{t('title')}</PageTitle>
      </div>
      <PagePanel>
        <MypageDashboardSkeleton />
      </PagePanel>
    </div>
  );
}
