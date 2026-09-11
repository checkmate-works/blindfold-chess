/**
 * Links into a chunk's comment thread.
 *
 * A chunk detail page (`/chunks/[slug]`) renders one tab at a time, chosen
 * by `?tab=`. With no param it opens Positions whenever the chunk has any
 * linked positions, and only falls through to Comments when every tab
 * before it is empty (`resolveDefaultChunkTab` in the page). The comment
 * tree therefore exists only under `?tab=comments`: a link into the thread
 * that omits the param lands on Positions, where a `#post-{id}` anchor has
 * no target and the visitor sees no trace of the comment they came for — an
 * author redirected there after posting sees only the success toast. A chunk
 * with no linked positions happens to fall through to Comments and looks
 * fine, which is how the omission stayed unnoticed in the create actions.
 *
 * Every href that targets the comments — the comment icon on a list card,
 * a notification deep link, the redirect after a create action — is built
 * here so the param has exactly one spelling.
 */

function chunkCommentsPath(slug: string, locale?: string): string {
  const prefix = locale ? `/${locale}` : '';
  return `${prefix}/chunks/${slug}?tab=comments`;
}

/**
 * The chunk's Comments tab, scrolled to the tab bar (`id="chunk-tabs"`)
 * rather than the top of the page — the tabs sit well below the
 * description / board / metadata block.
 *
 * No locale prefix: the callers render it through the i18n `Link`.
 */
export function buildChunkCommentsTabHref(slug: string): string {
  return `${chunkCommentsPath(slug)}#chunk-tabs`;
}

/**
 * One comment (a post or a reply) in the chunk's thread, anchored at the
 * `id="post-{id}"` node every `CommentNode` carries.
 *
 * `locale` prefixes the path for a server-side `redirect()`, which bypasses
 * the i18n `Link`; omit it for an href the `Link` localizes itself. `toast`
 * is the `?toast=` key `ToastContainer` shows on arrival, for the redirect
 * after a create action.
 */
export function buildChunkCommentHref(
  slug: string,
  postId: string,
  opts: { locale?: string; toast?: 'post_created' } = {}
): string {
  const toast = opts.toast ? `&toast=${opts.toast}` : '';
  return `${chunkCommentsPath(slug, opts.locale)}${toast}#post-${postId}`;
}
