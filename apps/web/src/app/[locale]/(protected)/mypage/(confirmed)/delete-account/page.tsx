import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { Breadcrumb, Divider, PagePanel, PageTitle } from '@/app/[locale]/_components';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';

import { DeleteAccountButton } from './_components';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata.deleteAccount' });

  return {
    ...generateCanonicalMetadata({ locale, path: 'mypage/delete-account' }),
    title: t('title'),
    description: t('description'),
    robots: { index: false, follow: false },
  };
}

export default async function DeleteAccountPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'deleteAccount' });

  return (
    <div className="space-y-8">
      <PageTitle>{t('title')}</PageTitle>
      <PagePanel>
        <div className="space-y-6">
          <p className="text-sm text-muted-foreground">{t('warning')}</p>
          <DeleteAccountButton locale={locale} />
        </div>

        <Divider />

        <Breadcrumb
          locale={locale}
          items={[{ label: t('breadcrumbMypage'), href: '/mypage' }, { label: t('title') }]}
        />
      </PagePanel>
    </div>
  );
}
