import { and, eq, isNotNull } from 'drizzle-orm';

import { announcements } from './schema';

/**
 * The rule for a published announcement, whoever is reading: `published`
 * status *and* a non-null `published_at`. Members-only announcements match.
 *
 * Both halves are load-bearing, for the same reason as
 * `publiclyVisibleArticle` in `./articles-visibility`: `status` is what the
 * admin form sets, while `published_at` is what every public ordering reads —
 * the listing sorts `published_at DESC`, where Postgres puts `NULL` first, so a
 * row with the status but no timestamp would sit above every dated one. The
 * admin validation refuses that combination, so this only decides what happens
 * to a row written some other way. Spelling the pair out per query is what let
 * most reads drift to checking only the status.
 *
 * Use this where the reader may be a member: the listing and its count show
 * members-only announcements with a lock badge, the detail page renders a
 * sign-in prompt for them, and a signed-in reader can like them. Everything
 * that publishes to anonymous readers uses {@link publiclyVisibleAnnouncement}
 * instead. The two are separate names rather than one function with a flag so
 * that each call site says which audience it serves.
 *
 * A leaf module depending on nothing but the schema, so that the query module
 * and `./announcement-likes` can share it without importing each other.
 */
export function publishedAnnouncement() {
  return and(eq(announcements.status, 'published'), isNotNull(announcements.publishedAt));
}

/**
 * {@link publishedAnnouncement} restricted to `visibility = 'public'`: the
 * announcements anyone may see without signing in — the sitemap and the
 * site-wide banner.
 */
export function publiclyVisibleAnnouncement() {
  return and(publishedAnnouncement(), eq(announcements.visibility, 'public'));
}
