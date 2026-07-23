/**
 * Repertoires (型) — catalog page (route slug /repertoires).
 *
 * @description
 * Every user's repertoire courses (UGC, modelled on games): opening /
 * middlegame / endgame studies. Each card is one repertoire (name, side,
 * phase); its lines (variations) live inside it. The list is a public catalog —
 * a signed-out visitor sees everyone's kata, and it is crawlable (sitemap +
 * indexable) like any other public UGC catalog. The feature is soft-launched
 * only in the sense that it isn't linked from global nav yet, not by being
 * private or hidden from search engines.
 *
 * Cards reuse the shared `CatalogListCard` so they carry the same board
 * thumbnail, author, like, and comment affordances as the puzzle /
 * position-memory catalogs — repertoires are likeable/commentable via the same
 * polymorphic infrastructure (`targetType` / `topicType` = `'repertoire'`).
 *
 * @flow
 * 1. The "Create Kata" CTA (signed-in only) sits at the top and routes to
 *    /repertoires/new to play moves on a board or paste a PGN.
 * 2. A signed-in user with `building` (unpublished) repertoires sees them in
 *    their own section — the only listing surface they have, since building
 *    repertoires are excluded from every public/community query below.
 * 3. List every public repertoire, newest-published first, paginated, with
 *    like + comment meta.
 * 4. Each card links to /repertoires/[id].
 */
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { Button } from '@/app/_components';
import { Link } from '@/i18n/routing';
import { FaPlus } from 'react-icons/fa';

import { getOptionalUser } from '@/lib/auth';
import { DEFAULT_PAGE_SIZE, getPaginationParams } from '@/lib/pagination';
import { getRepertoireCardMeta } from '@/lib/repertoires/card-meta';
import {
  countPublicRepertoires,
  listBuildingRepertoiresForUser,
  listPublicRepertoires,
} from '@/lib/repertoires/queries';

import { HelpTourButton, PageLayout, SectionTitle } from '@/app/[locale]/_components';
import type { HelpStep } from '@/app/[locale]/_components';
import { AdSlot } from '@/app/[locale]/_components/AdSense/AdSlot';
import { PaginationNav } from '@/app/[locale]/_components/PaginationNav';
import { createPageMetadata } from '@/app/[locale]/_lib/metadata';
import type { LocaleSearchPageProps as Props } from '@/app/[locale]/_lib/types';

import { RepertoireListCard } from './_components/RepertoireListCard';

export const dynamic = 'force-dynamic';

/** `data-tour-id`s the help tour points at (see `helpSteps` below). */
const CATALOG_HELP_TARGET = 'repertoires-catalog-help';
const IMPORT_HELP_TARGET = 'repertoires-import-help';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return createPageMetadata({
    params,
    namespace: 'Repertoires',
    path: 'repertoires',
  });
}

export default async function RepertoiresPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  const page = Number(sp.page) || 1;
  // Catalog side filter — only the two valid colours pass; anything else (or
  // absent) is "all".
  const side = sp.side === 'white' || sp.side === 'black' ? sp.side : undefined;

  const [t, user, totalCount] = await Promise.all([
    getTranslations({ locale, namespace: 'Repertoires' }),
    getOptionalUser(),
    countPublicRepertoires(side),
  ]);

  const { currentPage, totalPages, limit, offset } = getPaginationParams(
    page,
    totalCount,
    DEFAULT_PAGE_SIZE
  );

  const [rows, buildingRows] = await Promise.all([
    listPublicRepertoires(limit, offset, side),
    user ? listBuildingRepertoiresForUser(user.id) : Promise.resolve([]),
  ]);

  // Side filter tabs — a query-param change, so each is a plain link (page
  // resets to 1). The public list + its pagination carry `side`; the owner's
  // "in progress" section above is intentionally unfiltered.
  const sideFilters = [
    { key: 'all', href: '/repertoires', label: t('filter.all'), active: side === undefined },
    {
      key: 'white',
      href: '/repertoires?side=white',
      label: t('form.side_white'),
      active: side === 'white',
    },
    {
      key: 'black',
      href: '/repertoires?side=black',
      label: t('form.side_black'),
      active: side === 'black',
    },
  ];

  const cardMeta = await getRepertoireCardMeta(
    [...buildingRows, ...rows].map((r) => r.repertoire.id),
    user?.id
  );

  // Two-step tour: what this catalog is, then (signed-in only) the Import CTA.
  // A step whose target is absent is skipped by HelpTourButton, but gating the
  // import step on `user` keeps the tour honest for signed-out visitors.
  const helpSteps: HelpStep[] = [
    {
      targetId: CATALOG_HELP_TARGET,
      title: t('help.catalog.title'),
      description: t('help.catalog.description'),
      side: 'bottom',
      align: 'center',
    },
    ...(user
      ? [
          {
            targetId: IMPORT_HELP_TARGET,
            title: t('help.import.title'),
            description: t('help.import.description'),
            side: 'bottom' as const,
            align: 'center' as const,
          },
        ]
      : []),
  ];

  return (
    <PageLayout
      title={<span data-tour-id={CATALOG_HELP_TARGET}>{t('title')}</span>}
      titleAction={<HelpTourButton steps={helpSteps} label={t('help.label')} />}
      locale={locale}
      breadcrumb={[{ label: t('title') }]}
    >
      {/* Owner's own in-progress drafts lead (their only listing surface), each
          section under its own heading — the same SectionTitle-first layout the
          puzzle / position-memory catalogs use, so the Create CTA sits under a
          heading rather than floating above the whole page. */}
      {buildingRows.length > 0 && (
        <>
          <SectionTitle>{t('building.sectionTitle')}</SectionTitle>
          <div className="space-y-3 pb-4">
            {buildingRows.map((card) => (
              <RepertoireListCard
                key={card.repertoire.id}
                card={card}
                meta={cardMeta(card.repertoire.id)}
                locale={locale}
              />
            ))}
          </div>
        </>
      )}

      <SectionTitle>{t('sectionTitle')}</SectionTitle>

      {user && (
        <div data-tour-id={IMPORT_HELP_TARGET}>
          <Link href="/repertoires/new" locale={locale}>
            <Button asChild variant="primary" size="lg" icon={<FaPlus />} fullWidth>
              {t('importCta')}
            </Button>
          </Link>
        </div>
      )}

      <nav className="flex flex-wrap gap-2" aria-label={t('filter.label')}>
        {sideFilters.map((f) => (
          <Link
            key={f.key}
            href={f.href}
            locale={locale}
            aria-current={f.active ? 'page' : undefined}
            className={`rounded-full px-3 py-1 text-sm transition-colors ${
              f.active
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            {f.label}
          </Link>
        ))}
      </nav>

      {rows.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">{t('empty')}</p>
      ) : (
        <div className="space-y-3">
          {rows.map((card) => (
            <RepertoireListCard
              key={card.repertoire.id}
              card={card}
              meta={cardMeta(card.repertoire.id)}
              locale={locale}
            />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <PaginationNav
          currentPage={currentPage}
          totalPages={totalPages}
          buildHref={(p) => `/${locale}/repertoires?page=${p}${side ? `&side=${side}` : ''}`}
          locale={locale}
        />
      )}

      <AdSlot slot="content-bottom" />
    </PageLayout>
  );
}
