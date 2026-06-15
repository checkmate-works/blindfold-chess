import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { getPositionWithProfileById } from '@/lib/positions/queries';

import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { PositionEditRequestsView } from '../../../_components/edit-request/PositionEditRequestsView';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ locale: Locale; id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: 'practice.positionEditRequests' });
  const row = await getPositionWithProfileById({ id, type: 'memory' });

  if (!row) {
    return { title: resolveTitle('Not Found', locale) };
  }

  const title = t('pageTitle', { name: row.position.title });
  return {
    ...generateCanonicalMetadata({
      locale,
      path: `practice/position-memory/${id}/edit-requests`,
      title,
    }),
    title: resolveTitle(title, locale),
  };
}

export default async function PositionMemoryEditRequestsPage({ params }: Props) {
  const { locale, id } = await params;
  return <PositionEditRequestsView positionId={id} positionType="memory" locale={locale} />;
}
