/**
 * Puzzle — Problem List
 *
 * @description
 * Displays a paginated list of user-submitted puzzle positions.
 * Each card shows a board thumbnail, title, description excerpt,
 * and author information.
 *
 * @flow
 * 1. Browse the list of available puzzles
 * 2. Click a card to navigate to the puzzle detail page (not yet implemented)
 * 3. On the detail page, attempt to find the best move(s)
 */
import { getTranslations } from 'next-intl/server';
import Image from 'next/image';

import { ADSENSE_SLOT_CONTENT_BOTTOM, IS_LOCAL_DEV } from '@/config';
import { Link } from '@/i18n/routing';
import { createSearchParamsCache, parseAsInteger } from 'nuqs/server';

import { getOptionalUser } from '@/lib/auth';
import { getPaginationParams } from '@/lib/pagination';
import { countPositions, listPositionsWithProfile } from '@/lib/positions/queries';
import { ThemedBoardThumbnail } from '@/lib/positions/ui/ThemedBoardThumbnail';
import { truncate } from '@/lib/text';
import { resolveDisplayName } from '@/lib/users/display-name';

import {
  BetaNotice,
  Divider,
  PagePanel,
  PageTitle,
  PaginationNav,
  SectionTitle,
} from '@/app/[locale]/_components';
import { AdSenseGuard } from '@/app/[locale]/_components/AdSense/AdSenseGuard';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { LocaleSearchPageProps as Props } from '@/app/[locale]/_lib/types';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 12;

const searchParamsCache = createSearchParamsCache({
  page: parseAsInteger.withDefault(1),
});

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'practice.puzzle' });
  const title = t('list.title');
  const description = t('description');

  return {
    ...generateCanonicalMetadata({ locale, path: 'practice/puzzle', title, description }),
    title: resolveTitle(title, locale),
    description,
  };
}

export default async function PuzzleListPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { page } = await searchParamsCache.parse(searchParams);
  const t = await getTranslations({ locale, namespace: 'practice.puzzle' });
  const tNav = await getTranslations({ locale, namespace: 'navigation' });

  // TODO: Consider a composite index on (type, deleted_at, created_at DESC)
  // if this query becomes slow with large data volumes.
  const totalCount = await countPositions({ type: 'puzzle' });

  const { currentPage, totalPages, limit, offset } = getPaginationParams(
    page,
    totalCount,
    PAGE_SIZE
  );

  const rows = await listPositionsWithProfile({ type: 'puzzle', limit, offset });

  const currentUser = await getOptionalUser();

  const buildHref = (p: number) => {
    const params = new URLSearchParams();
    if (p > 1) params.set('page', String(p));
    const qs = params.toString();
    return `/${locale}/practice/puzzle${qs ? `?${qs}` : ''}`;
  };

  return (
    <div className="space-y-8">
      <PageTitle>{t('list.title')}</PageTitle>

      <PagePanel>
        <SectionTitle>{t('list.sectionTitle')}</SectionTitle>

        <BetaNotice className="mb-4">
          <p>{t('list.betaNotice')}</p>
        </BetaNotice>

        {rows.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">{t('list.empty')}</p>
        ) : (
          <div className="space-y-3">
            {rows.map(({ position, profile }) => {
              const displayName = resolveDisplayName(profile);
              const descriptionExcerpt = truncate(position.description);

              return (
                <Link
                  key={position.id}
                  href={`/practice/puzzle/${position.id}`}
                  locale={locale}
                  className="block p-4 rounded-md border border-border bg-card hover:border-foreground/20 transition-colors"
                >
                  <div className="flex gap-4">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0">
                      <ThemedBoardThumbnail fen={position.fen} className="w-full h-full" />
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {profile?.avatarUrl ? (
                          <Image
                            src={profile.avatarUrl}
                            alt={displayName}
                            width={24}
                            height={24}
                            className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                            <span className="text-xs text-muted-foreground">
                              {displayName.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <span className="font-medium text-foreground">{displayName}</span>
                        <span className="whitespace-nowrap">{t('list.submittedBy')}</span>
                      </div>
                      <h3 className="font-medium text-foreground truncate">{position.title}</h3>
                      {descriptionExcerpt && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {descriptionExcerpt}
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        <PaginationNav currentPage={currentPage} totalPages={totalPages} buildHref={buildHref} />

        {currentUser && (
          <div className="py-4">
            <Link
              href="/practice/puzzle/new"
              locale={locale}
              className="block w-full text-center px-4 py-2 text-sm rounded bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
            >
              {t('list.createButton')}
            </Link>
          </div>
        )}

        {(IS_LOCAL_DEV || ADSENSE_SLOT_CONTENT_BOTTOM) && (
          <AdSenseGuard slot="content-bottom" slotId={ADSENSE_SLOT_CONTENT_BOTTOM ?? ''} />
        )}

        <Divider />

        <Breadcrumb
          items={[{ label: tNav('practice'), href: '/practice' }, { label: t('list.title') }]}
          locale={locale}
        />
      </PagePanel>
    </div>
  );
}
