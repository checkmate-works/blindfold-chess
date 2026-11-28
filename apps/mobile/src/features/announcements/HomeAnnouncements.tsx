import { useCallback, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { ListRow, ListSection } from "../../components";
import { AnnouncementRow } from "./AnnouncementRow";
import {
  fetchAnnouncementPage,
  type AnnouncementSummary,
} from "./announcements-api";

/**
 * How many announcements home shows. Home is where a player notices that
 * something is new, not where they browse: the rest are one row away.
 */
const HOME_ANNOUNCEMENTS_LIMIT = 3;

/**
 * The home tab's announcements: the first few of the list (pinned first,
 * then newest), and a row into the full list (`/announcements`).
 *
 * Read again whenever home comes into focus, so a new announcement shows up
 * without restarting the app. Renders nothing while loading, when the
 * request fails, or when there are none: like the daily puzzle, a section
 * saying "could not load" or "nothing yet" would only stand between the
 * player and the rest of home.
 */
export function HomeAnnouncements() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const [items, setItems] = useState<AnnouncementSummary[]>([]);
  const language = i18n.language;

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void fetchAnnouncementPage(1, language).then((result) => {
        // A failed refresh keeps what is already shown.
        if (active && result !== "failed") setItems(result.items);
      });
      return () => {
        active = false;
      };
    }, [language]),
  );

  if (items.length === 0) return null;

  return (
    <ListSection title={t("announcements.title")}>
      {items.slice(0, HOME_ANNOUNCEMENTS_LIMIT).map((announcement) => (
        <AnnouncementRow key={announcement.slug} announcement={announcement} />
      ))}
      <ListRow
        testID="home-announcements-all"
        title={t("announcements.viewAll")}
        onPress={() => router.push("/announcements")}
      />
    </ListSection>
  );
}
