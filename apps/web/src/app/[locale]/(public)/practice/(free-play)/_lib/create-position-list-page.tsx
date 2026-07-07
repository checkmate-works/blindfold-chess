import { getTranslations } from 'next-intl/server';

import { Button } from '@/app/_components';
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
import { AdSlot } from '@/app/[locale]/_components/AdSense/AdSlot';
import { TEXT_LINK_CLASSES } from '@/app/[locale]/_lib/link-classes';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { LocaleSearchPageProps as Props } from '@/app/[locale]/_lib/types';

import { toggleLike } from '../_actions/toggleLike';
import { PositionListCard } from '../_components/PositionListCard';

const PAGE_SIZE = 12;

const searchParamsCache = createSearchParamsCache({
  page: parseAsInteger.withDefault(1),
  sort: parseAsString.withDefault('new'),
});

/**
 * Configuration for a paginated "position list" page. Both the puzzle and the
 * position-memory list pages are the same page parameterised by these fields —
 * see `createPositionListPage` below.
 */
export interface PositionListPageConfig {
  /** Last URL segment, e.g. `'puzzle'` or `'position-memory'`. Drives the
   * canonical path, breadcrumb/CTA hrefs, and help-tour `data-tour-id`s. */
  slug: string;
  /** `next-intl` namespace exposing `list.*`, `help.*`, `description`, etc. */
  namespace: string;
  /** `positions` table discriminator passed to the position queries. */
  positionType: Parameters<typeof countPositions>[0]['type'];
  /** Reply-meta target type for `getReplyMetaMap`. */
  replyMetaType: Parameters<typeof getReplyMetaMap>[0];
  /** Translation key for the sort dropdown labels (e.g. `'topics.positionPuzzle.sort'`). */
  sortTranslationKey: string;
  /** When set, the overview help step appends a tutorial link pointing at this
   * path (without locale prefix, e.g. `'practice/position-memory/tutorial'`). */
  tutorialPath?: string;
}

/**
 * Build the `generateMetadata` + `Page` pair for a position-list page.
 *
 * Each concrete page (`puzzle/page.tsx`, `position-memory/page.tsx`) keeps its
 * own feature TSDoc and `export const dynamic`, then re-exports the functions
 * this factory returns.
 */
export function createPositionListPage(config: PositionListPageConfig) {
  const { slug, namespace, positionType, replyMetaType, sortTranslationKey, tutorialPath } = config;
  const basePath = `/practice/${slug}`;
  const canonicalPath = `practice/${slug}`;
  const tourIdPrefix = `${slug}-list`;

  async function generateMetadata({ params }: Props) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace });
    const title = t('list.title');
    const description = t('description');

    return {
      ...generateCanonicalMetadata({ locale, path: canonicalPath, title, description }),
      title: resolveTitle(title, locale),
      description,
    };
  }

  async function Page({ params, searchParams }: Props) {
    const { locale } = await params;
    const { page, sort } = await searchParamsCache.parse(searchParams);
    const sortBy = validateSort(sort);
    const t = await getTranslations({ locale, namespace });
    const tNav = await getTranslations({ locale, namespace: 'navigation' });

    // TODO: Consider a composite index on (type, deleted_at, created_at DESC)
    // if this query becomes slow with large data volumes.
    const totalCount = await countPositions({ type: positionType });

    const { currentPage, totalPages, limit, offset } = getPaginationParams(
      page,
      totalCount,
      PAGE_SIZE
    );

    const rows = await listPositionsWithProfile({
      type: positionType,
      sort: sortBy,
      limit,
      offset,
    });

    const currentUser = await getOptionalUser();
    const positionIds = rows.map((r) => r.position.id);
    const [likeMetaMap, replyMetaMap] = await Promise.all([
      getPositionLikeMetaMap(positionIds, currentUser?.id),
      getReplyMetaMap(replyMetaType, positionIds),
    ]);

    const buildHref = (p: number) => {
      const urlParams = new URLSearchParams();
      if (sortBy !== 'new') urlParams.set('sort', sortBy);
      if (p > 1) urlParams.set('page', String(p));
      const qs = urlParams.toString();
      return `/${locale}${basePath}${qs ? `?${qs}` : ''}`;
    };

    const justNowLabel = t('justNow');

    // Help-tour steps: explain what the module is and — only when the create
    // CTA is rendered (signed-in users) — point at it. When `tutorialPath` is
    // set, a tutorial link is folded into the overview popover HTML; driver.js
    // renders `description` as innerHTML. Authored line breaks (`\n`) in the
    // messages become `<br />` so the popover keeps the intended paragraphing.
    const nl2br = (text: string) => text.replace(/\n/g, '<br />');
    const overviewDescription = tutorialPath
      ? `${nl2br(t('help.overview.description'))}<br /><br /><a href="/${locale}/${tutorialPath}" class="${TEXT_LINK_CLASSES}">${t('list.tutorialLink')}</a>`
      : nl2br(t('help.overview.description'));
    const helpSteps: HelpStep[] = [
      {
        targetId: `${tourIdPrefix}-intro`,
        title: t('help.overview.title'),
        description: overviewDescription,
        side: 'bottom',
        align: 'start',
      },
      ...(currentUser
        ? [
            {
              targetId: `${tourIdPrefix}-create`,
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
        <div data-tour-id={`${tourIdPrefix}-intro`}>
          <SectionTitle>{t('list.sectionTitle')}</SectionTitle>
        </div>

        {totalCount > 0 && (
          <div className="flex justify-end">
            <SortSelect
              basePath={basePath}
              translationKey={sortTranslationKey}
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
                detailHref={`${basePath}/${position.id}`}
                i18nNamespace={namespace}
                toggleLikeAction={toggleLike}
                justNowLabel={justNowLabel}
                locale={locale}
              />
            ))}
          </div>
        )}

        <PaginationNav currentPage={currentPage} totalPages={totalPages} buildHref={buildHref} />

        {currentUser && (
          <div className="py-4" data-tour-id={`${tourIdPrefix}-create`}>
            <Link href={`${basePath}/new`} locale={locale}>
              <Button asChild variant="primary" size="lg" icon={<FaPlus />} fullWidth>
                {t('list.createButton')}
              </Button>
            </Link>
          </div>
        )}

        <AdSlot slot="content-bottom" />
      </PageLayout>
    );
  }

  return { generateMetadata, Page };
}
