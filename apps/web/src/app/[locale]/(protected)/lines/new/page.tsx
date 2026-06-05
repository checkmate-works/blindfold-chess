/**
 * Lines (型) — import page. Paste a PGN-with-variations to create a new line.
 */
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { getAuthenticatedUser } from '@/lib/auth';

import { PageLayout } from '@/app/[locale]/_components';
import { createPageMetadata } from '@/app/[locale]/_lib/metadata';
import type { LocalePageProps as Props } from '@/app/[locale]/_lib/types';

import { LineImportForm } from '../_components/LineImportForm';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return createPageMetadata({
    params,
    namespace: 'Lines',
    path: 'lines/new',
    titleKey: 'new.title',
    noIndex: true,
    omitDescription: true,
  });
}

export default async function NewLinePage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Lines' });
  await getAuthenticatedUser();

  return (
    <PageLayout
      title={t('new.title')}
      locale={locale}
      breadcrumb={[{ label: t('title'), href: '/lines' }, { label: t('new.title') }]}
    >
      <p className="mb-6 text-sm text-muted-foreground">{t('new.description')}</p>
      <LineImportForm locale={locale} />
    </PageLayout>
  );
}
