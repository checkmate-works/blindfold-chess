import { ProseArticle } from './ProseArticle';

/**
 * Loading placeholder for a {@link ProseArticle} body: three paragraph
 * blocks of bars, the second opening with a heading-height bar.
 *
 * Lives next to the component it mirrors for the same reason as
 * `CardLinkSkeleton`: a skeleton reserves the real box, and a stale copy
 * produces the layout shift it exists to prevent. The article and learn
 * detail loading states wrote this markup out identically.
 *
 * No hooks, so it serves a Server Component loading boundary (articles) and a
 * Client Component one (learn) alike.
 */
export function ProseArticleSkeleton() {
  return (
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
  );
}
