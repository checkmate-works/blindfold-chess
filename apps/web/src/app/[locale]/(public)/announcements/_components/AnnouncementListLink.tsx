import { formatLocalDate } from '@/lib/i18n/format-date';

import { ListLink } from '@/app/[locale]/_components';

import type { AnnouncementListItem } from '../_lib/queries';
import { MembersOnlyBadge } from './MembersOnlyBadge';

type Props = {
  announcement: AnnouncementListItem;
  locale: string;
};

/**
 * One announcement row, shared by the two surfaces that list announcements:
 * the `/announcements` page and the signed-in dashboard's "latest" card.
 *
 * Each surface used to carry its own copy of the same `ListLink` call, and the
 * copies had already drifted on the one thing that was not pure markup — the
 * members-only chip. The dashboard rendered a bare translated string and
 * suppressed it for signed-in readers; the list rendered the chip component
 * for everyone. Same announcement, two different rows. Owning the row here is
 * what makes them agree by construction rather than by review, and it puts the
 * badge rule somewhere a reader can find it: a row is marked gated when the
 * announcement is gated, full stop.
 *
 * Named for the `ListLink` it wraps rather than "list item" because
 * {@link AnnouncementListItem} is already the name of the row's DATA in
 * `_lib/queries`; a component sharing that name would be indistinguishable
 * from the type at an import site.
 */
export function AnnouncementListLink({ announcement, locale }: Props) {
  const publishedDate = announcement.publishedAt
    ? formatLocalDate(new Date(announcement.publishedAt), locale)
    : undefined;

  return (
    <ListLink
      href={`/announcements/${announcement.slug}`}
      icon="📢"
      title={announcement.title}
      meta={publishedDate}
      locale={locale}
      isPinned={announcement.pinnedAt !== null}
      badge={
        announcement.visibility === 'members_only' ? (
          <MembersOnlyBadge locale={locale} />
        ) : undefined
      }
    />
  );
}
