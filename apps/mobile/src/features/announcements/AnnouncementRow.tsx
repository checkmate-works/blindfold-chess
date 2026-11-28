import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { ListRow } from "../../components";
import {
  formatAnnouncementDate,
  type AnnouncementSummary,
} from "./announcements-api";

/**
 * One announcement in a `ListSection`: the title, the date under it, and
 * "Pinned" at the trailing edge of a pinned one. Opens the announcement.
 */
export function AnnouncementRow({
  announcement,
}: {
  announcement: AnnouncementSummary;
}) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  return (
    <ListRow
      testID={`announcement-${announcement.slug}`}
      title={announcement.title}
      subtitle={formatAnnouncementDate(announcement.publishedAt, i18n.language)}
      value={announcement.pinned ? t("announcements.pinned") : undefined}
      onPress={() =>
        router.push({
          pathname: "/announcements/[slug]",
          params: { slug: announcement.slug, title: announcement.title },
        })
      }
    />
  );
}
