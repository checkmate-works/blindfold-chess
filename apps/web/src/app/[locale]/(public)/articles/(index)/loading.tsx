import { getTranslations } from 'next-intl/server';

import { getLocaleFromPathnameHeader } from '@/i18n/get-locale-from-pathname-header';

import { Divider, PagePanel, PageTitle, SectionTitle } from '@/app/[locale]/_components';
import { BreadcrumbSkeleton } from '@/app/[locale]/_components/Breadcrumb';

/**
 * Articles listing loading skeleton.
 *
 * Shown while the server renders the paginated article list. Mirrors the
 * PageTitle + PagePanel + SectionTitle + ListLinkContainer/ListLink structure
 * to minimise CLS when the real content swaps in. Static labels (PageTitle,
 * SectionTitle) render the real translated strings; dynamic article rows use
 * bar placeholders.
 *
 * Lives in the `(index)` route group, not directly under `articles/`, so that
 * it bounds the listing page alone. A `loading.tsx` stays in the tree of every
 * route beneath its segment — a child's own `loading.tsx` nests inside it
 * rather than replacing it — so at `articles/loading.tsx` this skeleton was
 * rendered into `articles/[slug]` too. Its `headers()` read then kept that
 * statically generated route dynamic: with a published article in the DB, the
 * build listed `/[locale]/articles/[slug]` as `ƒ` and prerendered nothing,
 * and a probe build with `dynamic = 'error'` named `headers()` as the cause.
 * The listing itself is dynamic anyway (it reads `searchParams`), which is
 * what makes the header read acceptable here.
 */
export default async function ArticlesLoading() {
  const locale = await getLocaleFromPathnameHeader();
  const t = await getTranslations({ locale, namespace: 'articles' });

  return (
    <div className="space-y-8">
      <PageTitle>{t('pageTitle')}</PageTitle>

      <PagePanel>
        <SectionTitle>{t('articlesListTitle')}</SectionTitle>

        {/* ListLinkContainer skeleton */}
        <ul className="bg-card border border-border rounded-md overflow-hidden">
          {Array.from({ length: 8 }).map((_, i) => (
            <li key={i} className="border-b border-border last:border-b-0 px-4 py-3 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 bg-muted rounded flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="h-5 bg-muted rounded w-3/4" />
                </div>
                <div className="h-4 bg-muted rounded w-20 flex-shrink-0" />
              </div>
            </li>
          ))}
        </ul>

        <Divider />

        {/* Breadcrumb: [Home logo] / Articles. Single static crumb mirrors
            `(index)/page.tsx`'s `<Breadcrumb items={[{ label: t('pageTitle') }]} />`. */}
        <BreadcrumbSkeleton crumbs={[{ label: t('pageTitle'), current: true }]} />
      </PagePanel>
    </div>
  );
}
