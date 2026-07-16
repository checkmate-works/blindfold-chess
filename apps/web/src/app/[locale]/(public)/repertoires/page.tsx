/**
 * Repertoires (型) — catalog page (route slug /repertoires).
 *
 * @description
 * Every user's repertoire courses (UGC, modelled on games): opening /
 * middlegame / endgame studies. Each card is one repertoire (name, side,
 * phase); its lines (variations) live inside it. The list is a public catalog —
 * a signed-out visitor sees everyone's kata. The feature is concealed only by
 * not being linked from global nav while it is built out, not by being private.
 *
 * Cards reuse the shared `CatalogListCard` so they carry the same board
 * thumbnail, author, like, and comment affordances as the puzzle /
 * position-memory catalogs — repertoires are likeable/commentable via the same
 * polymorphic infrastructure (`targetType` / `topicType` = `'repertoire'`).
 *
 * @flow
 * 1. List every public repertoire, newest first, paginated, with like + comment meta.
 * 2. The "Import" CTA (signed-in only) sits at the top and routes to
 *    /repertoires/new to paste a PGN.
 * 3. Each card links to /repertoires/[id].
 */
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { Button } from '@/app/_components';
import { Link } from '@/i18n/routing';
import { FaPlus } from 'react-icons/fa';

import { getOptionalUser } from '@/lib/auth';
import { DEFAULT_PAGE_SIZE, getPaginationParams } from '@/lib/pagination';
import { getRepertoireCardMeta } from '@/lib/repertoires/card-meta';
import { countPublicRepertoires, listPublicRepertoires } from '@/lib/repertoires/queries';

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
    noIndex: true,
  });
}

export default async function RepertoiresPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  const page = Number(sp.page) || 1;

  const [t, user, totalCount] = await Promise.all([
    getTranslations({ locale, namespace: 'Repertoires' }),
    getOptionalUser(),
    countPublicRepertoires(),
  ]);

  const { currentPage, totalPages, limit, offset } = getPaginationParams(
    page,
    totalCount,
    DEFAULT_PAGE_SIZE
  );

  const rows = await listPublicRepertoires(limit, offset);

  const cardMeta = await getRepertoireCardMeta(
    rows.map((r) => r.repertoire.id),
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
      <SectionTitle>{t('sectionTitle')}</SectionTitle>

      {user && (
        <div className="py-4" data-tour-id={IMPORT_HELP_TARGET}>
          <Link href="/repertoires/new" locale={locale}>
            <Button asChild variant="primary" size="lg" icon={<FaPlus />} fullWidth>
              {t('importCta')}
            </Button>
          </Link>
        </div>
      )}

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
          buildHref={(p) => `/${locale}/repertoires?page=${p}`}
        />
      )}

      <AdSlot slot="content-bottom" />
    </PageLayout>
  );
}
