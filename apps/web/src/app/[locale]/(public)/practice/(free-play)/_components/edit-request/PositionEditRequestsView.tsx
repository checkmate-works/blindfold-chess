import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { getOptionalUser } from '@/lib/auth';
import { getPositionWithProfileById } from '@/lib/positions/queries';
import type { PositionType } from '@/lib/positions/types';

import { PageLayout } from '@/app/[locale]/_components';
import type { Locale } from '@/app/[locale]/_lib/types';

import { PositionEditRequestSection } from './PositionEditRequestSection';

type Props = {
  positionId: string;
  /** 'memory' | 'puzzle' — drives the namespace + breadcrumb paths. */
  positionType: Extract<PositionType, 'memory' | 'puzzle'>;
  locale: Locale;
};

const TYPE_CONFIG = {
  memory: { namespace: 'practice.positionMemory', listPath: '/practice/position-memory' },
  puzzle: { namespace: 'practice.puzzle', listPath: '/practice/puzzle' },
} as const;

/**
 * Shared body for the dedicated "Chunk suggestions" page on a position
 * (memory / puzzle). Mirrors `chunks/[slug]/edit-requests/page.tsx`: the
 * form + review list live here on their own page, reached via the
 * `PositionEditRequestCallout` CTA on the detail page — not inlined on the
 * detail page itself.
 */
export async function PositionEditRequestsView({ positionId, positionType, locale }: Props) {
  const row = await getPositionWithProfileById({ id: positionId, type: positionType });
  if (!row) {
    notFound();
  }
  const { position } = row;

  const { namespace, listPath } = TYPE_CONFIG[positionType];
  const detailPath = `${listPath}/${position.id}`;

  const [user, t, tNav, tType] = await Promise.all([
    getOptionalUser(),
    getTranslations({ locale, namespace: 'practice.positionEditRequests' }),
    getTranslations({ locale, namespace: 'navigation' }),
    getTranslations({ locale, namespace }),
  ]);

  return (
    <PageLayout
      title={t('pageTitle', { name: position.title })}
      locale={locale}
      breadcrumb={[
        { label: tNav('practice'), href: '/practice' },
        { label: tType('list.title'), href: listPath },
        { label: position.title, href: detailPath },
        { label: t('breadcrumb') },
      ]}
    >
      <PositionEditRequestSection
        positionId={position.id}
        detailHref={detailPath}
        viewerId={user?.id ?? null}
        ownerId={position.userId}
        locale={locale}
      />
    </PageLayout>
  );
}
