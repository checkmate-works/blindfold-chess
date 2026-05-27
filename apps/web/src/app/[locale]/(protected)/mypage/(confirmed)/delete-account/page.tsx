import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { PageLayout } from '@/app/[locale]/_components';
import { createPageMetadata } from '@/app/[locale]/_lib/metadata';
import type { LocalePageProps } from '@/app/[locale]/_lib/types';

import { DeleteAccountButton } from './_components';

type Props = LocalePageProps;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return createPageMetadata({
    params,
    namespace: 'metadata.deleteAccount',
    path: 'mypage/delete-account',
    noIndex: true,
  });
}

export default async function DeleteAccountPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'deleteAccount' });

  return (
    <PageLayout
      title={t('title')}
      locale={locale}
      breadcrumb={[{ label: t('breadcrumbMypage'), href: '/mypage' }, { label: t('title') }]}
    >
      <div className="space-y-6">
        <p className="text-sm text-muted-foreground">{t('warning')}</p>
        <DeleteAccountButton locale={locale} />
      </div>
    </PageLayout>
  );
}
