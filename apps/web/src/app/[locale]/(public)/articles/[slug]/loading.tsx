import { Divider, PagePanel, PageTitle } from '@/app/[locale]/_components';
import { BreadcrumbSkeleton } from '@/app/[locale]/_components/Breadcrumb';
import { ProseArticle } from '@/app/[locale]/_components/ProseArticle';

/**
 * Article detail loading skeleton.
 *
 * Mirrors `articles/[slug]/page.tsx`: PageTitle (the article title) + PagePanel
 * holding the prose body, the right-aligned publish date, and the Divider +
 * compact Breadcrumb that `PageLayout` appends. Without this file the route
 * inherits `articles/loading.tsx`, which reserves the index page's list rows
 * and "all articles" section title — a layout this page never renders.
 *
 * Deliberately reads no locale and no translations. The route is statically
 * generated (`generateStaticParams` + `revalidate`), and a server-side locale
 * read in a loading boundary (`headers()`, or `getLocale()`, which falls
 * through to a `headers()` probe) would force the whole route dynamic. The
 * inherited index skeleton did exactly that. The one static label the real
 * page shows — the "Articles" crumb — lives in the server-only `articles`
 * namespace, so rather than shipping it to the client dictionary for a Client
 * Component, every text slot here is a bar.
 */
export default function ArticleLoading() {
  return (
    <div className="space-y-8">
      <PageTitle>
        <span className="inline-block h-7 md:h-8 w-2/3 bg-muted rounded align-middle animate-pulse" />
      </PageTitle>

      <PagePanel>
        <ProseArticle className="animate-pulse">
          <div className="space-y-3">
            <div className="h-4 bg-muted rounded w-full" />
            <div className="h-4 bg-muted rounded w-11/12" />
            <div className="h-4 bg-muted rounded w-10/12" />
            <div className="h-4 bg-muted rounded w-full" />
            <div className="h-4 bg-muted rounded w-9/12" />
          </div>

          <div className="mt-6 space-y-3">
            <div className="h-5 bg-muted rounded w-1/3" />
            <div className="h-4 bg-muted rounded w-full" />
            <div className="h-4 bg-muted rounded w-11/12" />
            <div className="h-4 bg-muted rounded w-3/4" />
          </div>

          <div className="mt-6 space-y-3">
            <div className="h-4 bg-muted rounded w-full" />
            <div className="h-4 bg-muted rounded w-10/12" />
            <div className="h-4 bg-muted rounded w-4/5" />
          </div>
        </ProseArticle>

        {/* Publish date */}
        <div className="flex justify-end animate-pulse">
          <div className="h-4 bg-muted rounded w-28" />
        </div>

        {/* Breadcrumb: [Home logo] / Articles / <article title>, with the same
            `!mt-4 space-y-4` wrapper and compact density as `PageLayout`. */}
        <div className="!mt-4 space-y-4">
          <Divider />
          <BreadcrumbSkeleton
            crumbs={[{ widthClass: 'w-12' }, { widthClass: 'w-40' }]}
            density="compact"
          />
        </div>
      </PagePanel>
    </div>
  );
}
