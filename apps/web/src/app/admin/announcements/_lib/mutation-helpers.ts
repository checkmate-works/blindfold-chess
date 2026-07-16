import {
  hasAnnouncementNotification,
  notifyAllUsersOfAnnouncement,
} from '@/lib/notifications/announcement-notification';

/**
 * The payload `createAnnouncement` accepts. Defined here (a plain module)
 * rather than in the `"use server"` action files so both actions and the form
 * can share one shape — `export type` re-exports are forbidden inside
 * `"use server"` files (see the Server Actions convention in CLAUDE.md).
 */
export type AnnouncementMutationData = {
  slug: string;
  title: string;
  content: string;
  locale: string;
  status: string;
  visibility: string;
  pinnedAt: string | null;
  publishedAt: string | null;
  sendNotification?: boolean;
};

/**
 * `updateAnnouncement` additionally toggles the banner flag; create leaves it
 * at the column default.
 */
export type AnnouncementUpdateData = AnnouncementMutationData & {
  showAsBanner: boolean;
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
export function buildAnnouncementMutationValues(
  data: Pick<
    AnnouncementMutationData,
    'slug' | 'title' | 'content' | 'locale' | 'pinnedAt' | 'publishedAt'
  >
) {
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
