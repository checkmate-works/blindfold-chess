import type { ReactNode } from 'react';

import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound, redirect } from 'next/navigation';

import { validateFenStructure } from '@blindfold-chess/features/chess-core';
import type { User } from '@supabase/supabase-js';
import { createSearchParamsCache, parseAsInteger } from 'nuqs/server';

import { getAuthenticatedUser, getOptionalUser } from '@/lib/auth';
import type { getReplyMetaMap } from '@/lib/db/reply-meta-queries';
import { EMPTY_REPLY_META } from '@/lib/db/reply-meta-queries';
import { loadPositionCreateContext } from '@/lib/positions/create-page-context';
import type { countPositions } from '@/lib/positions/queries';
import { getPositionById, getPositionWithProfileById } from '@/lib/positions/queries';
import { loadAvailableTags, loadPositionTags } from '@/lib/positions/tag-loader';
import type { PositionTagBundle } from '@/lib/positions/tag-loader';

import { PageLayout, PaginationNav, SectionTitle } from '@/app/[locale]/_components';
import { GuestCreateGate } from '@/app/[locale]/_components/GuestCreateGate';
import {
  createPageMetadata,
  generateCanonicalMetadata,
  resolveTitle,
} from '@/app/[locale]/_lib/metadata';
import type { Locale, LocaleSearchPageProps } from '@/app/[locale]/_lib/types';

import { toggleLike } from '../_actions/toggleLike';
import { PositionListCard } from '../_components/PositionListCard';
import { PositionEditRequestsView } from '../_components/edit-request/PositionEditRequestsView';
import { loadForksPageData } from './load-forks-page-data';

/**
 * Page factories shared by the puzzle and position-memory route trees.
 *
 * The two features are the same UGC "position" resource stored under different
 * `positions.type` discriminators, so their sub-pages (`new`, `[id]/edit`,
 * `[id]/forks`, `[id]/edit-requests`) are mechanical substitutions of each
 * other. Each factory below builds the `generateMetadata` + `Page` pair for
 * one sub-page kind, parameterised by {@link PositionRouteKind}; the concrete
 * `page.tsx` files keep their feature TSDoc and route-segment config exports
 * and re-export what the factory returns (same idiom as
 * `createPositionListPage`).
 *
 * Genuine divergences are injected per page via config callbacks rather than
 * unified: the puzzle edit/create forms carry solution moves (loaded via
 * `loadPuzzleWithSolutions`, seeded via `?solution=`) that position-memory
 * does not have.
 */
export interface PositionRouteKind {
  /** URL segment under `/practice`, e.g. `'puzzle'`. Drives canonical paths,
   * breadcrumb hrefs, and the create page's fork-redirect target. */
  slug: 'puzzle' | 'position-memory';
  /** `next-intl` namespace exposing `list.*`, `forksList.*`, `edit.*`, `create.*`. */
  namespace: string;
  /** `positions` table discriminator passed to the position queries. */
  positionType: Extract<Parameters<typeof countPositions>[0]['type'], 'puzzle' | 'memory'>;
  /** Reply-meta target type for `getReplyMetaMap`. */
  replyMetaType: Parameters<typeof getReplyMetaMap>[0];
}

export const PUZZLE_ROUTE: PositionRouteKind = {
  slug: 'puzzle',
  namespace: 'practice.puzzle',
  positionType: 'puzzle',
  replyMetaType: 'position_puzzle',
};

export const POSITION_MEMORY_ROUTE: PositionRouteKind = {
  slug: 'position-memory',
  namespace: 'practice.positionMemory',
  positionType: 'memory',
  replyMetaType: 'position_memory',
};

type IdProps = {
  params: Promise<{ locale: Locale; id: string }>;
};

type IdSearchProps = IdProps & {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * Build the `generateMetadata` + `Page` pair for a position's edit-requests
 * page. The body is entirely delegated to the shared
 * `PositionEditRequestsView`; only the position type and canonical path vary.
 */
export function createPositionEditRequestsPage(route: PositionRouteKind) {
  const { slug, positionType } = route;

  async function generateMetadata({ params }: IdProps): Promise<Metadata> {
    const { locale, id } = await params;
    const t = await getTranslations({ locale, namespace: 'practice.positionEditRequests' });
    const row = await getPositionWithProfileById({ id, type: positionType });

    if (!row) {
      return { title: resolveTitle('Not Found', locale) };
    }

    const title = t('pageTitle', { name: row.position.title });
    return {
      ...generateCanonicalMetadata({
        locale,
        path: `practice/${slug}/${id}/edit-requests`,
        title,
      }),
      title: resolveTitle(title, locale),
    };
  }

  async function Page({ params }: IdProps) {
    const { locale, id } = await params;
    return <PositionEditRequestsView positionId={id} positionType={positionType} locale={locale} />;
  }

  return { generateMetadata, Page };
}

const FORKS_PAGE_SIZE = 20;

const forksSearchParamsCache = createSearchParamsCache({
  page: parseAsInteger.withDefault(1),
});

/**
 * Build the `generateMetadata` + `Page` pair for a position's forks listing
 * (`/practice/<slug>/[id]/forks`): a paginated list of every fork that
 * descends from a single position row. 404 when the source row is missing or
 * has been soft-deleted — orphan forks can still be viewed from their own
 * detail pages, but the parent-rooted listing requires a live parent to make
 * sense as a destination.
 */
export function createPositionForksPage(route: PositionRouteKind) {
  const { slug, namespace, positionType, replyMetaType } = route;

  async function generateMetadata({ params }: IdSearchProps): Promise<Metadata> {
    const { locale, id } = await params;
    const t = await getTranslations({ locale, namespace });
    const parent = await getPositionById({ id, type: positionType });
    if (!parent) return { title: t('forksList.title') };
    const title = t('forksList.titleOf', { parentTitle: parent.title });
    return {
      ...generateCanonicalMetadata({ locale, path: `practice/${slug}/${id}/forks`, title }),
      title: resolveTitle(title, locale),
    };
  }

  async function Page({ params, searchParams }: IdSearchProps) {
    const { locale, id } = await params;
    const { page } = await forksSearchParamsCache.parse(searchParams);

    const parent = await getPositionById({ id, type: positionType });
    if (!parent) notFound();

    const t = await getTranslations({ locale, namespace });
    const tNav = await getTranslations({ locale, namespace: 'navigation' });

    // Data assembly lives in the injected-style loader so this Page stays
    // thin wiring like the edit / create factories.
    const { rows, totalCount, currentPage, totalPages, likeMetaMap, replyMetaMap } =
      await loadForksPageData({
        parentId: id,
        positionType,
        replyMetaType,
        page,
        pageSize: FORKS_PAGE_SIZE,
      });

    const justNowLabel = t('justNow');
    const buildHref = (p: number) => {
      const qs = p > 1 ? `?page=${p}` : '';
      return `/${locale}/practice/${slug}/${id}/forks${qs}`;
    };

    return (
      <PageLayout
        title={t('forksList.titleOf', { parentTitle: parent.title })}
        locale={locale}
        breadcrumb={[
          { label: tNav('practice'), href: '/practice' },
          { label: t('list.title'), href: `/practice/${slug}` },
          { label: parent.title, href: `/practice/${slug}/${id}` },
          { label: t('forksList.breadcrumb') },
        ]}
      >
        <SectionTitle>{t('forksList.sectionTitle', { count: totalCount })}</SectionTitle>
        {rows.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">{t('forksList.empty')}</p>
        ) : (
          <div className="space-y-3">
            {rows.map(({ position, profile }) => {
              const detailHref = `/practice/${slug}/${position.id}`;
              return (
                <PositionListCard
                  key={position.id}
                  position={position}
                  profile={profile}
                  likeMeta={likeMetaMap.get(position.id) ?? { likeCount: 0, likedByMe: false }}
                  replyMeta={replyMetaMap.get(position.id) ?? EMPTY_REPLY_META}
                  detailHref={detailHref}
                  i18nNamespace={namespace}
                  toggleLikeAction={toggleLike}
                  justNowLabel={justNowLabel}
                  locale={locale}
                />
              );
            })}
          </div>
        )}

        <PaginationNav currentPage={currentPage} totalPages={totalPages} buildHref={buildHref} />
      </PageLayout>
    );
  }

  return { generateMetadata, Page };
}

/** The slice of the position row the edit-page factory itself needs; the
 * loaded row (with any feature extras) is passed through to `renderForm`. */
type EditablePosition = {
  id: string;
  userId: string | null;
  title: string;
};

export interface PositionEditPageOptions<TData extends { position: EditablePosition }> {
  /** Load the position row plus whatever extra data the edit form needs
   * (e.g. puzzle solutions). `null` renders a 404. */
  loadEditData: (id: string) => Promise<TData | null>;
  /** Render the feature's edit form from the loaded data and tag bundles. */
  renderForm: (args: {
    data: TData;
    attachedTags: Awaited<ReturnType<typeof loadPositionTags>>;
    availableTags: PositionTagBundle;
  }) => ReactNode;
  /** Render the feature's delete button inside the shared danger zone. */
  renderDeleteButton: (args: { positionId: string; locale: Locale }) => ReactNode;
}

/**
 * Build the `generateMetadata` + `Page` pair for a position's owner-only edit
 * page (`/practice/<slug>/[id]/edit`). Non-owners are redirected to the
 * detail page; the page is `noindex`. Data loading and the form itself differ
 * per feature (puzzles edit solution moves too) and are injected via
 * {@link PositionEditPageOptions}.
 */
export function createPositionEditPage<TData extends { position: EditablePosition }>(
  route: PositionRouteKind,
  options: PositionEditPageOptions<TData>
) {
  const { slug, namespace } = route;
  const { loadEditData, renderForm, renderDeleteButton } = options;

  async function generateMetadata({ params }: IdProps): Promise<Metadata> {
    const { locale, id } = await params;
    const t = await getTranslations({ locale, namespace: `${namespace}.edit` });
    const title = t('title');

    return {
      ...generateCanonicalMetadata({
        locale,
        path: `practice/${slug}/${id}/edit`,
        title,
      }),
      title: resolveTitle(title, locale),
      robots: { index: false, follow: false },
    };
  }

  async function Page({ params }: IdProps) {
    const { locale, id } = await params;
    const t = await getTranslations({ locale, namespace });
    const tNav = await getTranslations({ locale, namespace: 'navigation' });

    const user = await getAuthenticatedUser();

    const data = await loadEditData(id);
    if (!data) {
      notFound();
    }

    const { position } = data;

    if (position.userId !== user.id) {
      redirect(`/${locale}/practice/${slug}/${id}`);
    }

    const [attachedTags, availableTags] = await Promise.all([
      loadPositionTags(position.id, locale),
      loadAvailableTags(locale),
    ]);

    return (
      <PageLayout
        title={t('list.title')}
        locale={locale}
        breadcrumb={[
          { label: tNav('practice'), href: '/practice' },
          { label: t('list.title'), href: `/practice/${slug}` },
          { label: position.title, href: `/practice/${slug}/${id}` },
          { label: t('edit.title') },
        ]}
      >
        <SectionTitle>{t('edit.title')}</SectionTitle>
        {renderForm({ data, attachedTags, availableTags })}

        <section
          aria-labelledby="danger-zone-heading"
          className="mt-12 rounded-md border border-destructive/40 p-4 space-y-3"
        >
          <h2 id="danger-zone-heading" className="text-sm font-semibold text-destructive">
            {t('delete.sectionTitle')}
          </h2>
          <p className="text-sm text-muted-foreground">{t('delete.sectionDescription')}</p>
          {renderDeleteButton({ positionId: position.id, locale })}
        </section>
      </PageLayout>
    );
  }

  return { generateMetadata, Page };
}

export interface CreatePositionFormContext<TSeed> {
  user: User | null;
  displayName: string;
  availableTags: PositionTagBundle;
  forkSeed: TSeed | undefined;
  /** `?fen=` board seed (e.g. "create from this game position"), present only
   * when structurally valid — a stray URL never breaks the form. */
  injectedFen: string | undefined;
  /** Resolved search params, for feature-specific extras (e.g. the puzzle
   * page's `?solution=` SAN seed). */
  searchParams: Record<string, string | string[] | undefined>;
}

export interface PositionCreatePageOptions<TSeed> {
  /** Per-feature fork-seed loader passed to `loadPositionCreateContext`. */
  loadForkSeed: (params: { sourceId: string; currentUserId: string }) => Promise<TSeed | null>;
  /** Render the feature's create form. */
  renderForm: (ctx: CreatePositionFormContext<TSeed>) => ReactNode;
  /** Translation key for the page title / list breadcrumb label (default
   * `'list.title'`; the puzzle page historically uses `'title'`). */
  listTitleKey?: string;
  /** When set, wraps the section title + form in a `<div>` with this class
   * (the puzzle page keeps its historical `space-y-6` grouping; without it
   * the panel's default `space-y-8` applies between title and form). */
  formSectionClassName?: string;
}

/**
 * Build the `generateMetadata` + `Page` pair for a position create page
 * (`/practice/<slug>/new`). Shared skeleton: metadata via
 * `createPageMetadata` (title-only), SSR create context (author name, fork
 * seed from `?from=`, tag bundle), `?fen=` validation, and the guest gate
 * around the injected form.
 */
export function createPositionCreatePage<TSeed>(
  route: PositionRouteKind,
  options: PositionCreatePageOptions<TSeed>
) {
  const { slug, namespace } = route;
  const { loadForkSeed, renderForm, listTitleKey = 'list.title', formSectionClassName } = options;

  function generateMetadata({ params }: LocaleSearchPageProps) {
    return createPageMetadata({
      params,
      namespace,
      path: `practice/${slug}/new`,
      titleKey: 'create.title',
      omitDescription: true,
    });
  }

  async function Page({ params, searchParams }: LocaleSearchPageProps) {
    const { locale } = await params;
    const resolvedSearchParams = await searchParams;
    const { from, fen: fenParam } = resolvedSearchParams;
    const user = await getOptionalUser();
    const t = await getTranslations({ locale, namespace });
    const tNav = await getTranslations({ locale, namespace: 'navigation' });

    const { displayName, forkSeed, availableTags } = await loadPositionCreateContext({
      user,
      from,
      locale,
      segment: slug,
      loadForkSeed,
    });

    const injectedFen =
      typeof fenParam === 'string' && validateFenStructure(fenParam).ok ? fenParam : undefined;

    const form = renderForm({
      user,
      displayName,
      availableTags,
      forkSeed,
      injectedFen,
      searchParams: resolvedSearchParams,
    });

    const listTitle = t(listTitleKey);
    const section = (
      <>
        <SectionTitle>{t('create.title')}</SectionTitle>
        {user ? form : <GuestCreateGate>{form}</GuestCreateGate>}
      </>
    );

    return (
      <PageLayout
        title={listTitle}
        locale={locale}
        breadcrumb={[
          { label: tNav('practice'), href: '/practice' },
          { label: listTitle, href: `/practice/${slug}` },
          { label: t('create.title') },
        ]}
      >
        {formSectionClassName ? <div className={formSectionClassName}>{section}</div> : section}
      </PageLayout>
    );
  }

  return { generateMetadata, Page };
}
