/**
 * Where to land after a post or reply is created on a topic whose discussion
 * lives on the entity's own page rather than under `/topics/…` — a practice
 * position, a repertoire.
 *
 * `createPostBase` / `createReplyBase` default to the
 * `/topics/<segment>/<key>/posts/<postId>` detail page, which these surfaces
 * have no equivalent of: their comment tree is rendered inline on the parent
 * page, so a new post or reply is reached by anchor instead. The parent page is
 * dynamic and re-queries on the way in, which is why none of these callers
 * revalidate before redirecting.
 *
 * Every one of them built the same template string inline, once per wrapper, so
 * the `?toast=` key and the `#post-` anchor prefix had as many copies as there
 * were attachment variants.
 */

function parentPageAnchor(
  locale: string,
  urlSegment: string,
  topicIdentifier: string,
  anchorId: string
): string {
  return `/${locale}/${urlSegment}/${topicIdentifier}?toast=post_created#post-${anchorId}`;
}

/** Anchored at the new post, which is a root of the parent page's tree. */
export function parentPagePostRedirect(
  locale: string,
  urlSegment: string,
  topicIdentifier: string
): (postId: string) => string {
  return (postId) => parentPageAnchor(locale, urlSegment, topicIdentifier, postId);
}

/** Anchored at the new reply, not at the post it hangs under. */
export function parentPageReplyRedirect(
  locale: string,
  urlSegment: string,
  topicIdentifier: string
): (postId: string, replyId: string) => string {
  return (_postId, replyId) => parentPageAnchor(locale, urlSegment, topicIdentifier, replyId);
}
