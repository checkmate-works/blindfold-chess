import { getTranslations } from 'next-intl/server';
import { notFound, redirect } from 'next/navigation';

import { getOptionalUser } from '@/lib/auth';
import { getViewerPendingEditRequestForPosition } from '@/lib/position-edit-requests/queries';
import { getPositionWithProfileById } from '@/lib/positions/queries';
import { loadAvailableTags, loadPositionTags } from '@/lib/positions/tag-loader';
import type { PositionType } from '@/lib/positions/types';

import { PageLayout, SectionTitle } from '@/app/[locale]/_components';
import type { Locale } from '@/app/[locale]/_lib/types';

import { PositionEditRequestForm } from './PositionEditRequestForm';

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
 * Shared body for the "Propose a suggestion" form page on a position
 * (memory / puzzle) — sibling of `PositionEditRequestsView`, which owns the
 * review list this page links back to. Split out from the list page so each
 * URL has one job: `/suggestions` reviews, `/suggestions/new` proposes.
 *
 * Only a signed-in non-owner without an existing pending request may submit
 * here; the owner or a viewer with a pending request is redirected back to
 * the list, where the relevant state (their own row, or nothing to review as
 * owner) already lives. Signed-out visitors still see this page with a
 * sign-in prompt rather than being redirected, so a shared link stays
 * meaningful.
 */
export async function PositionEditRequestNewView({ positionId, positionType, locale }: Props) {
  const row = await getPositionWithProfileById({ id: positionId, type: positionType });
  if (!row) {
    notFound();
  }
  const { position } = row;

  const { namespace, listPath } = TYPE_CONFIG[positionType];
  const detailPath = `${listPath}/${position.id}`;
  const suggestionsPath = `${detailPath}/suggestions`;

  const [user, t, tNav, tType] = await Promise.all([
    getOptionalUser(),
    getTranslations({ locale, namespace: 'practice.positionEditRequests' }),
    getTranslations({ locale, namespace: 'navigation' }),
    getTranslations({ locale, namespace }),
  ]);

  const viewerIsOwner = !!user && user.id === position.userId;
  const viewerHasPending =
    !!user &&
    !viewerIsOwner &&
    !!(await getViewerPendingEditRequestForPosition(positionId, user.id));

  if (viewerIsOwner || viewerHasPending) {
    redirect(`/${locale}${suggestionsPath}`);
  }

  // The same `cache()`-wrapped bundles the owner's position edit page uses.
  // Loaded unconditionally (cheap, and shared with the review page) rather
  // than branching on `user` — keeps this a plain top-level await.
  const [current, available] = await Promise.all([
    loadPositionTags(positionId, locale),
    loadAvailableTags(locale),
  ]);

  const breadcrumb = [
    { label: tNav('practice'), href: '/practice' },
    { label: tType('list.title'), href: listPath },
    { label: position.title, href: detailPath },
    { label: t('breadcrumb'), href: suggestionsPath },
    { label: t('newBreadcrumb') },
  ];

  return (
    <PageLayout
      title={t('newPageTitle', { name: position.title })}
      locale={locale}
      breadcrumb={breadcrumb}
    >
      <SectionTitle>{t('suggestCta')}</SectionTitle>

      {user ? (
        <PositionEditRequestForm
          positionId={positionId}
          current={current}
          available={available}
          cancelHref={suggestionsPath}
        />
      ) : (
        <p className="text-muted-foreground text-center py-8">{t('signInToSuggest')}</p>
      )}
    </PageLayout>
  );
}
