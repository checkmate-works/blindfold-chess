import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound, redirect } from 'next/navigation';

import { getAuthenticatedUser } from '@/lib/auth';
import { getPositionById } from '@/lib/positions/queries';

import { PageLayout, SectionTitle } from '@/app/[locale]/_components';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { EditPositionForm } from '../../_components/EditPositionForm';

type Props = {
  params: Promise<{ locale: Locale; id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: 'practice.positionMemory.edit' });
  const title = t('title');

  return {
    ...generateCanonicalMetadata({
      locale,
      path: `practice/position-memory/${id}/edit`,
      title,
    }),
    title: resolveTitle(title, locale),
    robots: { index: false, follow: false },
  };
}

export default async function EditPositionPage({ params }: Props) {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: 'practice.positionMemory' });
  const tNav = await getTranslations({ locale, namespace: 'navigation' });

  const user = await getAuthenticatedUser();

  const position = await getPositionById({ id, type: 'memory' });
  if (!position) {
    notFound();
  }

  if (position.userId !== user.id) {
    redirect(`/${locale}/practice/position-memory/${id}`);
  }

  return (
    <PageLayout
      title={t('list.title')}
      locale={locale}
      breadcrumb={[
        { label: tNav('practice'), href: '/practice' },
        { label: t('list.title'), href: '/practice/position-memory' },
        { label: position.title, href: `/practice/position-memory/${id}` },
        { label: t('edit.title') },
      ]}
    >
      <SectionTitle>{t('edit.title')}</SectionTitle>
      <EditPositionForm
        positionId={position.id}
        initial={{
          fen: position.fen,
          title: position.title,
          description: position.description,
        }}
      />
    </PageLayout>
  );
}
