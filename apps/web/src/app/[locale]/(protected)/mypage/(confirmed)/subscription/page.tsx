import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { getAuthenticatedUser } from '@/lib/auth';
import { getUserSubscription } from '@/lib/subscription';

import { PageTitle } from '@/app/[locale]/_components';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { LocaleSearchPageProps as Props } from '@/app/[locale]/_lib/types';

import { SubscriptionStatus } from './_components/SubscriptionStatus';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'subscription' });
  const title = t('title');

  return {
    ...generateCanonicalMetadata({ locale, path: 'mypage/subscription', title }),
    title,
  };
}

export default async function SubscriptionPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  const t = await getTranslations({ locale, namespace: 'subscription' });
  const tMypage = await getTranslations({ locale, namespace: 'Mypage' });

  const user = await getAuthenticatedUser();
  const subscription = await getUserSubscription(user.id);

  const showSuccessMessage = sp.status === 'success';

  return (
    <>
      <Breadcrumb
        locale={locale}
        items={[{ label: tMypage('title'), href: '/mypage' }, { label: t('title') }]}
      />
      <PageTitle>{t('title')}</PageTitle>

      {showSuccessMessage && (
        <div className="mt-4 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 p-4">
          <p className="text-sm text-green-800 dark:text-green-200">{t('successMessage')}</p>
        </div>
      )}

      <div className="mt-6">
        <SubscriptionStatus subscription={subscription} locale={locale} />
      </div>
    </>
  );
}
