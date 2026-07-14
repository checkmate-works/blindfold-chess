import {
  hasAnnouncementNotification,
  notifyAllUsersOfAnnouncement,
} from '@/lib/notifications/announcement-notification';

type AnnouncementMutationData = {
  slug: string;
  title: string;
  content: string;
  locale: string;
  pinnedAt: string | null;
  publishedAt: string | null;
};

/**
 * Map an announcement payload onto the column values shared by both
 * `createAnnouncement` (INSERT) and `updateAnnouncement` (UPDATE). Each caller
 * adds the fields that differ between the two (`status`/`visibility`
 * defaulting on create; `showAsBanner`/`updatedAt` on update).
 *
 * Keeping the column list in one place ensures the two paths stay in lockstep
 * when fields are added or removed from the `announcements` table.
 */
export function buildAnnouncementMutationValues(data: AnnouncementMutationData) {
  return {
    slug: data.slug,
    title: data.title,
    content: data.content,
    locale: data.locale,
    pinnedAt: data.pinnedAt ? new Date(data.pinnedAt) : null,
    publishedAt: data.publishedAt ? new Date(data.publishedAt) : null,
  };
}

/**
 * Send the all-users notification for a published announcement when the admin
 * opted in — at most once per announcement, guarded by
 * `hasAnnouncementNotification` so re-saving a published announcement never
 * re-notifies.
 */
export async function maybeNotifyAnnouncement(
  id: string,
  data: { slug: string; title: string; status: string; sendNotification?: boolean }
): Promise<void> {
  if (!data.sendNotification || data.status !== 'published') return;
  const alreadySent = await hasAnnouncementNotification(id);
  if (alreadySent) return;
  await notifyAllUsersOfAnnouncement(id, data.slug, data.title);
}
