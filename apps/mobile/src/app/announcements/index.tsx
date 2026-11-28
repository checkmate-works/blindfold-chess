import { useCallback, useEffect, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";

import { ListRow, ListSection } from "../../components";
import { AnnouncementRow } from "../../features/announcements/AnnouncementRow";
import {
  fetchAnnouncementPage,
  type AnnouncementPage,
} from "../../features/announcements/announcements-api";
import { spacing } from "../../theme";

/**
 * Announcements (the web's `/announcements`): every public announcement,
 * pinned first then newest, a page of the server's at a time with a row at
 * the end that reads the next. Members-only announcements stay on the web.
 */
export default function AnnouncementList() {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const [list, setList] = useState<AnnouncementPage | "failed" | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadFirst = useCallback(async () => {
    setList(await fetchAnnouncementPage(1, language));
  }, [language]);

  useEffect(() => {
    void loadFirst();
  }, [loadFirst]);

  const loadMore = async (current: AnnouncementPage) => {
    setLoadingMore(true);
    const next = await fetchAnnouncementPage(current.page + 1, language);
    setLoadingMore(false);
    // A failed page leaves the list as it is; the row stays to try again.
    if (next === "failed") return;
    const seen = new Set(current.items.map((item) => item.slug));
    setList({
      items: [
        ...current.items,
        ...next.items.filter((item) => !seen.has(item.slug)),
      ],
      page: next.page,
      totalPages: next.totalPages,
    });
  };

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            await loadFirst();
            setRefreshing(false);
          }}
        />
      }
    >
      <ListSection>
        {list === null ? (
          <ListRow title={t("records.loading")} />
        ) : list === "failed" ? (
          <ListRow title={t("announcements.loadFailed")} />
        ) : list.items.length === 0 ? (
          <ListRow title={t("announcements.empty")} />
        ) : (
          [
            ...list.items.map((announcement) => (
              <AnnouncementRow
                key={announcement.slug}
                announcement={announcement}
              />
            )),
            list.page < list.totalPages ? (
              <ListRow
                key="more"
                testID="announcements-more"
                title={
                  loadingMore
                    ? t("records.loading")
                    : t("announcements.loadMore")
                }
                accessory="none"
                disabled={loadingMore}
                onPress={() => void loadMore(list)}
              />
            ) : null,
          ]
        )}
      </ListSection>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.md,
  },
});
