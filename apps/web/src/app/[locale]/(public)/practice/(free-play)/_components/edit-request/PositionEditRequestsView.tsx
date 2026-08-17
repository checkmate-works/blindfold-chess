import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { getOptionalUser } from '@/lib/auth';
import { POSITION_KIND_CONFIG, getPositionListPath } from '@/lib/positions/kind';
import { getPositionWithProfileById } from '@/lib/positions/queries';
import type { PositionType } from '@/lib/positions/types';

import { HelpTourButton, PageLayout } from '@/app/[locale]/_components';
import type { HelpStep } from '@/app/[locale]/_components';
import type { Locale } from '@/app/[locale]/_lib/types';

import { PositionEditRequestSection } from './PositionEditRequestSection';

type Props = {
  positionId: string;
  /** 'memory' | 'puzzle' — drives the namespace + breadcrumb paths. */
  positionType: Extract<PositionType, 'memory' | 'puzzle'>;
  locale: Locale;
};

/**
 * Shared body for the dedicated "Chunk suggestions" review-list page on a
 * position (memory / puzzle), reached via the `PositionEditRequestSummaryLink`
 * (owner) or `PositionEditRequestSuggestLink` (proposer) CTAs on the detail
 * page — not inlined on the detail page itself. The submission form lives on
 * its own sibling page (`PositionEditRequestNewView`, at `/suggestions/new`)
 * rather than here, unlike `chunks/[slug]/edit-requests/page.tsx`, which
 * still combines both.
 */
export async function PositionEditRequestsView({ positionId, positionType, locale }: Props) {
  const row = await getPositionWithProfileById({ id: positionId, type: positionType });
  if (!row) {
    notFound();
  }
  const { position } = row;

  const { namespace } = POSITION_KIND_CONFIG[positionType];
  const listPath = getPositionListPath(positionType);
  const detailPath = `${listPath}/${position.id}`;

  const [user, t, tNav, tType] = await Promise.all([
    getOptionalUser(),
    getTranslations({ locale, namespace: 'practice.positionEditRequests' }),
    getTranslations({ locale, namespace: 'navigation' }),
    getTranslations({ locale, namespace }),
  ]);

  // Page-title help tour: explains the suggest-a-chunk concept ("you can
  // propose which chunks relate to this position; the owner reviews each
  // one"). Shown to every viewer, so it targets the always-present section
  // heading rather than the form (which only renders for eligible proposers).
  const helpSteps: HelpStep[] = [
    {
      targetId: 'position-edit-requests-intro',
      title: t('sectionTitle'),
      description: t('sectionHint'),
      side: 'bottom',
      align: 'center',
    },
  ];

  return (
    <PageLayout
      title={t('pageTitle', { name: position.title })}
      titleAction={<HelpTourButton steps={helpSteps} label={t('help.label')} />}
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
        newSuggestionHref={`${detailPath}/suggestions/new`}
        viewerId={user?.id ?? null}
        ownerId={position.userId}
        locale={locale}
      />
    </PageLayout>
  );
}
