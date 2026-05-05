import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { getAuthenticatedUser } from '@/lib/auth';
import { getUserSubscription } from '@/lib/billing/subscription';

import { PageLayout, SectionTitle } from '@/app/[locale]/_components';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { LocaleSearchPageProps as Props } from '@/app/[locale]/_lib/types';

import { SubscriptionStatus } from './_components/SubscriptionStatus';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'MypageSubscription' });
  const title = t('title');

  return {
    ...generateCanonicalMetadata({ locale, path: 'mypage/subscription', title }),
    title: resolveTitle(title, locale),
  };
}

export default async function SubscriptionPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  const t = await getTranslations({ locale, namespace: 'MypageSubscription' });

  const user = await getAuthenticatedUser();
  const subscription = await getUserSubscription(user.id);

  // The `bfc_ads_hidden` cookie is refreshed by the request proxy
  // (`apps/web/src/proxy.ts`) on every navigation to this path, so a
  // freshly-paid (or lapsed) subscription is reflected before render.
  // The proxy mutates the outgoing response, which is the only context in
  // which Next.js 16 allows cookie writes outside Server Actions / Route
  // Handlers — Server Components like this one cannot call `cookies().set()`
  // during render.
  const showSuccessMessage = sp.status === 'success';

  return (
    <PageLayout
      title={t('title')}
      locale={locale}
      breadcrumb={[{ label: t('breadcrumbMypage'), href: '/mypage' }, { label: t('title') }]}
    >
      <SectionTitle>{t('sectionTitle')}</SectionTitle>
      <div className="space-y-6">
        {showSuccessMessage && (
          <div className="rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 p-4">
            <p className="text-sm text-green-800 dark:text-green-200">{t('successMessage')}</p>
          </div>
        )}

        <SubscriptionStatus subscription={subscription} locale={locale} />
      </div>
    </PageLayout>
  );
}
