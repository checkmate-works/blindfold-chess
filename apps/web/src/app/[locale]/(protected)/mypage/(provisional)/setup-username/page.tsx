import { getTranslations } from 'next-intl/server';

import { PageLayout } from '@/app/[locale]/_components';
import { createPageMetadata } from '@/app/[locale]/_lib/metadata';
import type { LocalePageProps } from '@/app/[locale]/_lib/types';

import { UsernameForm } from './_components';

type Props = LocalePageProps;

export function generateMetadata({ params }: Props) {
  return createPageMetadata({
    params,
    namespace: 'metadata.setupUsername',
    path: 'mypage/setup-username',
    noIndex: true,
  });
}

export default async function SetupUsernamePage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'setupUsername' });

  return (
    <PageLayout title={t('title')} locale={locale}>
      <UsernameForm locale={locale} />
    </PageLayout>
  );
}
