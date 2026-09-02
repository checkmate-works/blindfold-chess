/**
 * Where to land after a reply is posted on a topic whose discussion lives on
 * the entity's own page rather than under `/topics/…` — a practice position, a
 * repertoire.
 *
 * `createReplyBase` defaults to the `/topics/<segment>/<key>/posts/<postId>`
 * detail page, which these surfaces have no equivalent of: their reply tree is
 * rendered inline on the parent page, so a reply is reached by anchor instead.
 * The parent page is dynamic and re-queries on the way in, which is why none of
 * these callers revalidate before redirecting.
 *
 * Every one of them built the same template string inline, once per wrapper, so
 * the `?toast=` key and the `#post-` anchor prefix had as many copies as there
 * were attachment variants.
 */
export function parentPageReplyRedirect(
  locale: string,
  urlSegment: string,
  topicIdentifier: string
): (postId: string, replyId: string) => string {
  return (_postId, replyId) =>
    `/${locale}/${urlSegment}/${topicIdentifier}?toast=post_created#post-${replyId}`;
}
