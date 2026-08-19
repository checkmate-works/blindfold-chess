import nextDynamic from 'next/dynamic';

/**
 * `MarkdownRenderer` behind a `next/dynamic` boundary, so the markdown
 * pipeline is code-split out of the pages that render prose and is not paid
 * for by any page that does not.
 *
 * `ssr: true` keeps the prose in the server-rendered HTML — the point is to
 * split the bundle, not to defer the content past first paint, which would
 * cost the article its indexability.
 *
 * The import is aliased to `nextDynamic` because every consumer is a route
 * file, where the identifier `dynamic` is Next's route segment config; the
 * five pages that used to declare this each carried a comment saying so.
 */
export const LazyMarkdownRenderer = nextDynamic(
  () =>
    import('./MarkdownRenderer').then((m) => ({
      default: m.MarkdownRenderer,
    })),
  { ssr: true }
);
