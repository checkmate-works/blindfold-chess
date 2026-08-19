import type { ReactNode } from 'react';

import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound, redirect } from 'next/navigation';

import { validateFenStructure } from '@blindfold-chess/features/chess-core';
import type { User } from '@supabase/supabase-js';
import { createSearchParamsCache, parseAsInteger } from 'nuqs/server';

import { getAuthenticatedUser, getOptionalUser } from '@/lib/auth';
import { EMPTY_LIKE_META } from '@/lib/db/like-queries';
import type { getReplyMetaMap } from '@/lib/db/reply-meta-queries';
import { EMPTY_REPLY_META } from '@/lib/db/reply-meta-queries';
import { buildPageHref } from '@/lib/pagination';
import { loadPositionCreateContext } from '@/lib/positions/create-page-context';
import type { countPositions } from '@/lib/positions/queries';
import { getPositionById, getPositionWithProfileById } from '@/lib/positions/queries';
import { loadAvailableTags, loadPositionTags } from '@/lib/positions/tag-loader';
import type { PositionTagBundle } from '@/lib/positions/tag-loader';

import { PageLayout, SectionTitle } from '@/app/[locale]/_components';
import { GuestCreateGate } from '@/app/[locale]/_components/GuestCreateGate';
import { PaginationNav } from '@/app/[locale]/_components/PaginationNav';
import {
  createPageMetadata,
  generateCanonicalMetadata,
  resolveTitle,
} from '@/app/[locale]/_lib/metadata';
import type { Locale, LocaleSearchPageProps } from '@/app/[locale]/_lib/types';

import { toggleLike } from '../_actions/toggleLike';
import { ForkSourceLine } from '../_components/ForkSourceLine';
import { PositionListCard } from '../_components/PositionListCard';
import { PositionEditRequestNewView } from '../_components/edit-request/PositionEditRequestNewView';
import { PositionEditRequestsView } from '../_components/edit-request/PositionEditRequestsView';
import { PositionHistoryView } from '../_components/history/PositionHistoryView';
import type { ForkPositionKind } from './fork-provenance';
import { resolveForkProvenance } from './fork-provenance';
import { loadForksPageData } from './load-forks-page-data';

/**
 * Page factories shared by the puzzle and position-memory route trees.
 *
 * The two features are the same UGC "position" resource stored under different
 * `positions.type` discriminators, so their sub-pages (`new`, `[id]/edit`,
 * `[id]/forks`, `[id]/suggestions`) are mechanical substitutions of each
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
 * The props every position sub-page view takes — they are interchangeable.
 * Async because all three are Server Components that load their own data.
 */
type PositionSubPageView = (props: {
  positionId: string;
  positionType: PositionRouteKind['positionType'];
  locale: Locale;
}) => ReactNode | Promise<ReactNode>;

type PositionSubPageOptions = {
  /** `next-intl` namespace holding this sub-page's title key. */
  namespace: string;
  /** Title key within `namespace`, interpolated with the position's `name`. */
  titleKey: string;
  /** Path under `practice/<slug>/<id>/`, e.g. `'suggestions/new'`. */
  pathSuffix: string;
  /** Rendered with the position id / type / locale; owns the whole body. */
  View: PositionSubPageView;
  /** Omit to stay indexable. */
  robots?: Metadata['robots'];
};

/**
 * Build the `generateMetadata` + `Page` pair for a position sub-page whose body
 * is entirely delegated to one view component: edit-requests, the "propose a
 * suggestion" form, and edit history.
 *
 * All three are the same page shape — resolve the row for its title, 404-title
 * it when missing, emit canonical metadata, then hand id/type/locale to a view —
 * so they are one factory parameterised by {@link PositionSubPageOptions} rather
 * than three near-identical ones. A sub-page that needs to do more than name a
 * view (data loading, an owner check, its own layout) gets its own factory
 * instead; see `createPositionEditPage` / `createPositionForksPage`.
 */
export function createPositionSubPage(
  route: PositionRouteKind,
  { namespace, titleKey, pathSuffix, View, robots }: PositionSubPageOptions
) {
  const { slug, positionType } = route;

  async function generateMetadata({ params }: IdProps): Promise<Metadata> {
    const { locale, id } = await params;
    const t = await getTranslations({ locale, namespace });
    const row = await getPositionWithProfileById({ id, type: positionType });

    if (!row) {
      return { title: resolveTitle('Not Found', locale) };
    }

    const title = t(titleKey, { name: row.position.title });
    return {
      ...generateCanonicalMetadata({
        locale,
        path: `practice/${slug}/${id}/${pathSuffix}`,
        title,
      }),
      title: resolveTitle(title, locale),
      ...(robots ? { robots } : {}),
    };
  }

  async function Page({ params }: IdProps) {
    const { locale, id } = await params;
    return <View positionId={id} positionType={positionType} locale={locale} />;
  }

  return { generateMetadata, Page };
}

/** Edit-requests list / review page (`/practice/<slug>/[id]/suggestions`). */
export function createPositionEditRequestsPage(route: PositionRouteKind) {
  return createPositionSubPage(route, {
    namespace: 'practice.positionEditRequests',
    titleKey: 'pageTitle',
    pathSuffix: 'suggestions',
    View: PositionEditRequestsView,
  });
}

/**
 * "Propose a suggestion" form (`/practice/<slug>/[id]/suggestions/new`) —
 * sibling of {@link createPositionEditRequestsPage}, which owns the list page
 * this one links back to.
 */
export function createPositionEditRequestNewPage(route: PositionRouteKind) {
  return createPositionSubPage(route, {
    namespace: 'practice.positionEditRequests',
    titleKey: 'newPageTitle',
    pathSuffix: 'suggestions/new',
    View: PositionEditRequestNewView,
  });
}

/** Edit-history page (`/practice/<slug>/[id]/history`). */
export function createPositionHistoryPage(route: PositionRouteKind) {
  return createPositionSubPage(route, {
    namespace: 'practice.positionHistory',
    titleKey: 'pageTitle',
    pathSuffix: 'history',
    View: PositionHistoryView,
    // Noindex: a revision row can preserve an overwritten old title /
    // description verbatim (e.g. the author fixing a typo or removing something
    // regrettable), so this page shouldn't be a search result in its own right
    // the way the detail page is.
    robots: { index: false, follow: true },
  });
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
    const buildHref = buildPageHref(`/${locale}/practice/${slug}/${id}/forks`);

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
                  likeMeta={likeMetaMap.get(position.id) ?? EMPTY_LIKE_META}
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

        <PaginationNav
          locale={locale}
          currentPage={currentPage}
          totalPages={totalPages}
          buildHref={buildHref}
        />
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
  const { loadEditData, renderForm } = options;

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
  /** `?chunk=<slug-or-id>` tag seed (e.g. "add a position for this chunk"),
   * resolved against `availableTags.chunks` — present only when it matches
   * a real chunk, a stray URL never breaks the form. */
  injectedChunkIds: string[] | undefined;
  /** Resolved search params, for feature-specific extras (e.g. the puzzle
   * page's `?solution=` SAN seed). */
  searchParams: Record<string, string | string[] | undefined>;
}

/**
 * The slice of a fork seed the factory itself reads, to render the page-level
 * provenance note. Both feature seeds carry it (see `BaseForkSeed` in
 * `@/lib/positions/fork`); everything else about the seed is the form's
 * business and passes through untouched.
 */
export type ForkSeedProvenance = {
  sourceId: string;
  sourceTitle: string;
  sourceType: ForkPositionKind;
};

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
export function createPositionCreatePage<TSeed extends ForkSeedProvenance>(
  route: PositionRouteKind,
  options: PositionCreatePageOptions<TSeed>
) {
  const { slug, namespace, positionType } = route;
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
    const { from, fen: fenParam, chunk: chunkParam } = resolvedSearchParams;
    const user = await getOptionalUser();
    const t = await getTranslations({ locale, namespace });
    const tNav = await getTranslations({ locale, namespace: 'navigation' });

    const { displayName, forkSeed, availableTags } = await loadPositionCreateContext({
      user,
      from,
      locale,
      loadForkSeed,
    });

    const injectedFen =
      typeof fenParam === 'string' && validateFenStructure(fenParam).ok ? fenParam : undefined;

    const injectedChunk =
      typeof chunkParam === 'string'
        ? availableTags.chunks.find((c) => c.slug === chunkParam || c.id === chunkParam)
        : undefined;
    const injectedChunkIds = injectedChunk ? [injectedChunk.id] : undefined;

    const form = renderForm({
      user,
      displayName,
      availableTags,
      forkSeed,
      injectedFen,
      injectedChunkIds,
      searchParams: resolvedSearchParams,
    });

    const listTitle = t(listTitleKey);
    const section = (
      <>
        <SectionTitle>{t('create.title')}</SectionTitle>
        {user ? form : <GuestCreateGate>{form}</GuestCreateGate>}
      </>
    );

    // Same slot, same component, same wording as the finished position's
    // detail page: a fork announces itself under the H1, whether it is
    // already saved or still being authored.
    const provenance = forkSeed
      ? resolveForkProvenance({
          sourceId: forkSeed.sourceId,
          sourceType: forkSeed.sourceType,
          pageType: positionType,
        })
      : null;
    const headerNote =
      forkSeed && provenance ? (
        <ForkSourceLine
          label={t(provenance.isCrossType ? 'create.createdFrom' : 'create.forkedFrom')}
          title={forkSeed.sourceTitle}
          href={provenance.href}
        />
      ) : undefined;

    return (
      <PageLayout
        title={listTitle}
        locale={locale}
        headerNote={headerNote}
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
