import { getTranslations } from 'next-intl/server';

import { getAuthenticatedUser } from '@/lib/auth';

import { Divider, PagePanel, PageTitle, SectionTitle } from '@/app/[locale]/_components';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { LocalePageProps as Props } from '@/app/[locale]/_lib/types';

import { CreatePositionForm } from '../_components/CreatePositionForm';

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'practice.positionMemory' });
  const title = t('create.title');

  return {
    ...generateCanonicalMetadata({ locale, path: 'practice/position-memory/new', title }),
    title: resolveTitle(title, locale),
  };
}

export default async function NewPositionPage({ params }: Props) {
  const { locale } = await params;
  await getAuthenticatedUser();
  const t = await getTranslations({ locale, namespace: 'practice.positionMemory' });
  const tNav = await getTranslations({ locale, namespace: 'navigation' });

  return (
    <div className="space-y-8">
      <PageTitle>{t('list.title')}</PageTitle>

      <PagePanel>
        <SectionTitle>{t('create.title')}</SectionTitle>
        <CreatePositionForm />

        <Divider />

        <Breadcrumb
          items={[
            { label: tNav('practice'), href: '/practice' },
            { label: t('list.title'), href: '/practice/position-memory' },
            { label: t('create.title') },
          ]}
          locale={locale}
        />
      </PagePanel>
    </div>
  );
}
