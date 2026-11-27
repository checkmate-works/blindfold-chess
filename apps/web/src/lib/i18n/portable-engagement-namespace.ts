/**
 * The namespace to hand a like / reply footer (`PostFooter`,
 * `PositionListCard`, `CatalogListCard`) when the card is rendered OUTSIDE
 * the route subtree that owns the entity's own strings.
 *
 * Those footers read four keys — `like`, `unlike`, `newReply`, `justNow` —
 * from whatever namespace the caller names, and every namespace that carries
 * them spells them identically. Inside `/practice` a puzzle card names
 * `practice.puzzle`; but the same card also appears in the home and topics
 * feeds, on a chunk's positions tab, on a profile's problems tab and under
 * `/mypage/problems`, and none of those subtrees ships the `practice`
 * dictionary: each mounts a scoped `NextIntlClientProvider` that REPLACES the
 * parent's messages (see `INTL_SCOPES` in
 * `@/app/[locale]/_lib/i18n-scopes`), and `practice` is ~40 KB that those
 * pages otherwise never read. Naming `practice.*` there made next-intl fall
 * back to the raw key, so the card showed "practice.puzzle.newReply".
 *
 * `topics` is provided by every one of those scopes (the footer itself reads
 * it for its aria-labels), so its copy of the four keys is the one that is
 * always reachable. Adding `practice` to the scopes instead would ship the
 * whole practice dictionary to the home page for four short strings.
 */
export const PORTABLE_ENGAGEMENT_NAMESPACE = 'topics.squares';
