import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { PageLayout, SectionTitle } from '@/app/[locale]/_components';
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
        <SectionTitle>{t('sectionTitle')}</SectionTitle>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">{t('warning')}</p>
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
            <li>{t('consequences.personalData')}</li>
            <li>{t('consequences.usernameLocked')}</li>
            <li>{t('consequences.canReregister')}</li>
          </ul>
        </div>
        <DeleteAccountButton locale={locale} />
      </div>
    </PageLayout>
  );
}
