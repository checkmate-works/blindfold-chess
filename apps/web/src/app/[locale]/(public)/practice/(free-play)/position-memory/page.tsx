/**
 * Position Memory — Problem List
 *
 * @description
 * Displays a paginated list of user-submitted positions for the
 * position memory practice module. Each card shows a board thumbnail,
 * title, description excerpt, and author information.
 *
 * @flow
 * 1. Browse the list of available positions
 * 2. Click a card to navigate to the position detail page
 * 3. On the detail page, configure time limit and start a session
 *
 * A help tour (the `?` next to the page title) introduces the module: the
 * first step explains what position memory is and carries the tutorial link
 * (the standalone link above the sort control was folded into it); the second
 * step points at the Create Problem CTA and is shown only to signed-in users.
 */
import { getTranslations } from 'next-intl/server';

import { Button } from '@/app/_components';
import { ADSENSE_SLOT_CONTENT_BOTTOM, IS_LOCAL_DEV } from '@/config';
import { Link } from '@/i18n/routing';
import { createSearchParamsCache, parseAsInteger, parseAsString } from 'nuqs/server';
import { FaPlus } from 'react-icons/fa';

import { getOptionalUser } from '@/lib/auth';
import { EMPTY_REPLY_META, getReplyMetaMap } from '@/lib/db/reply-meta-queries';
import { getPaginationParams } from '@/lib/pagination';
import { getPositionLikeMetaMap } from '@/lib/positions/like-queries';
import { countPositions, listPositionsWithProfile } from '@/lib/positions/queries';

import { SortSelect } from '@/app/[locale]/(public)/topics/_components/SortSelect';
import { validateSort } from '@/app/[locale]/(public)/topics/_lib/pagination';
import {
  HelpTourButton,
  PageLayout,
  PaginationNav,
  SectionTitle,
} from '@/app/[locale]/_components';
import type { HelpStep } from '@/app/[locale]/_components';
import { AdSenseGuard } from '@/app/[locale]/_components/AdSense/AdSenseGuard';
import { TEXT_LINK_CLASSES } from '@/app/[locale]/_lib/link-classes';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { LocaleSearchPageProps as Props } from '@/app/[locale]/_lib/types';

import { toggleLike } from '../_actions/toggleLike';
import { PositionListCard } from '../_components/PositionListCard';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 12;
const FOOTER_NAMESPACE = 'practice.positionMemory';

const searchParamsCache = createSearchParamsCache({
  page: parseAsInteger.withDefault(1),
  sort: parseAsString.withDefault('new'),
});

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'practice.positionMemory' });
  const title = t('list.title');
  const description = t('description');

  return {
    ...generateCanonicalMetadata({ locale, path: 'practice/position-memory', title, description }),
    title: resolveTitle(title, locale),
    description,
  };
}

export default async function PositionMemoryListPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { page, sort } = await searchParamsCache.parse(searchParams);
  const sortBy = validateSort(sort);
  const t = await getTranslations({ locale, namespace: 'practice.positionMemory' });
  const tNav = await getTranslations({ locale, namespace: 'navigation' });

  // TODO: Consider a composite index on (type, deleted_at, created_at DESC)
  // if this query becomes slow with large data volumes.
  const totalCount = await countPositions({ type: 'memory' });

  const { currentPage, totalPages, limit, offset } = getPaginationParams(
    page,
    totalCount,
    PAGE_SIZE
  );

  const rows = await listPositionsWithProfile({ type: 'memory', sort: sortBy, limit, offset });

  const currentUser = await getOptionalUser();
  const positionIds = rows.map((r) => r.position.id);
  const [likeMetaMap, replyMetaMap] = await Promise.all([
    getPositionLikeMetaMap(positionIds, currentUser?.id),
    getReplyMetaMap('position_memory', positionIds),
  ]);

  const buildHref = (p: number) => {
    const params = new URLSearchParams();
    if (sortBy !== 'new') params.set('sort', sortBy);
    if (p > 1) params.set('page', String(p));
    const qs = params.toString();
    return `/${locale}/practice/position-memory${qs ? `?${qs}` : ''}`;
  };

  const justNowLabel = t('justNow');

  // Help-tour steps: explain what position memory is (with the tutorial link
  // folded into the popover) and — only when the Create Problem CTA is rendered
  // (signed-in users) — point at it. The tutorial link lives in the popover HTML
  // because driver.js renders `description` as innerHTML; it replaces the
  // standalone link that previously floated above the sort control. Authored
  // line breaks (`\n`) in the messages become `<br />` so the popover keeps the
  // intended paragraphing.
  const nl2br = (text: string) => text.replace(/\n/g, '<br />');
  const tutorialLink = `<a href="/${locale}/practice/position-memory/tutorial" class="${TEXT_LINK_CLASSES}">${t('list.tutorialLink')}</a>`;
  const helpSteps: HelpStep[] = [
    {
      targetId: 'position-memory-list-intro',
      title: t('help.overview.title'),
      description: `${nl2br(t('help.overview.description'))}<br /><br />${tutorialLink}`,
      side: 'bottom',
      align: 'start',
    },
    ...(currentUser
      ? [
          {
            targetId: 'position-memory-list-create',
            title: t('help.create.title'),
            description: nl2br(t('help.create.description')),
            side: 'top' as const,
            align: 'center' as const,
          },
        ]
      : []),
  ];

  return (
    <PageLayout
      title={t('list.title')}
      titleAction={<HelpTourButton steps={helpSteps} label={t('help.label')} />}
      locale={locale}
      breadcrumb={[{ label: tNav('practice'), href: '/practice' }, { label: t('list.title') }]}
    >
      <div data-tour-id="position-memory-list-intro">
        <SectionTitle>{t('list.sectionTitle')}</SectionTitle>
      </div>

      {totalCount > 0 && (
        <div className="flex justify-end">
          <SortSelect
            basePath="/practice/position-memory"
            translationKey="topics.positionMemory.sort"
            currentSort={sortBy}
          />
        </div>
      )}

      {rows.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">{t('list.empty')}</p>
      ) : (
        <div className="space-y-3">
          {rows.map(({ position, profile }) => (
            <PositionListCard
              key={position.id}
              position={position}
              profile={profile}
              likeMeta={likeMetaMap.get(position.id) ?? { likeCount: 0, likedByMe: false }}
              replyMeta={replyMetaMap.get(position.id) ?? EMPTY_REPLY_META}
              detailHref={`/practice/position-memory/${position.id}`}
              i18nNamespace={FOOTER_NAMESPACE}
              toggleLikeAction={toggleLike}
              justNowLabel={justNowLabel}
              locale={locale}
            />
          ))}
        </div>
      )}

      <PaginationNav currentPage={currentPage} totalPages={totalPages} buildHref={buildHref} />

      {currentUser && (
        <div className="py-4" data-tour-id="position-memory-list-create">
          <Link href="/practice/position-memory/new" locale={locale}>
            <Button asChild variant="primary" size="lg" icon={<FaPlus />} fullWidth>
              {t('list.createButton')}
            </Button>
          </Link>
        </div>
      )}

      {(IS_LOCAL_DEV || ADSENSE_SLOT_CONTENT_BOTTOM) && (
        <AdSenseGuard slot="content-bottom" slotId={ADSENSE_SLOT_CONTENT_BOTTOM ?? ''} />
      )}
    </PageLayout>
  );
}
