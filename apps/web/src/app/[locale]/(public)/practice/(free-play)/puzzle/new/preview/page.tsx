import { getTranslations } from 'next-intl/server';

import { getAuthenticatedUser } from '@/lib/auth';

import { PageLayout } from '@/app/[locale]/_components';
import { createPageMetadata } from '@/app/[locale]/_lib/metadata';
import type { LocalePageProps as Props } from '@/app/[locale]/_lib/types';

import { PuzzlePreviewClient } from '../../_components/PuzzlePreviewClient';

export function generateMetadata({ params }: Props) {
  return createPageMetadata({
    params,
    namespace: 'practice.puzzle',
    path: 'practice/puzzle/new/preview',
    titleKey: 'preview.title',
    omitDescription: true,
  });
}

export default async function PuzzlePreviewPage({ params }: Props) {
  const { locale } = await params;
  await getAuthenticatedUser();
  const t = await getTranslations({ locale, namespace: 'practice.puzzle' });
  const tNav = await getTranslations({ locale, namespace: 'navigation' });

  return (
    <PageLayout
      title={t('preview.title')}
      locale={locale}
      breadcrumb={[
        { label: tNav('practice'), href: '/practice' },
        { label: t('title'), href: '/practice/puzzle' },
        { label: t('create.title'), href: '/practice/puzzle/new' },
        { label: t('preview.title') },
      ]}
    >
      <PuzzlePreviewClient />
    </PageLayout>
  );
}
