import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";

import { Screen } from "../../components";
import {
  fetchAnnouncement,
  formatAnnouncementDate,
  type Announcement,
} from "../../features/announcements/announcements-api";
import { MarkdownView } from "../../features/learn/MarkdownView";
import { LikeToggle } from "../../features/likes/LikeButton";
import { fontSize, fontWeight, spacing, useTheme } from "../../theme";

/**
 * One announcement (the web's `/announcements/<slug>`): the title, the date
 * and the body, rendered natively like a learn article, then the web's
 * heart with the total (signed out, a press opens the sign-in prompt). The
 * header shows the title the list passed while the body loads.
 */
export default function AnnouncementScreen() {
  const { slug, title } = useLocalSearchParams<{
    slug: string;
    title?: string;
  }>();
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const [announcement, setAnnouncement] = useState<
    Announcement | "notFound" | "failed" | null
  >(null);

  useEffect(() => {
    let cancelled = false;
    void fetchAnnouncement(slug ?? "", i18n.language).then((result) => {
      if (!cancelled) setAnnouncement(result);
    });
    return () => {
      cancelled = true;
    };
  }, [slug, i18n.language]);

  const loaded =
    announcement !== null && typeof announcement !== "string"
      ? announcement
      : null;

  return (
    <Screen edges={["bottom"]}>
      <Stack.Screen
        options={{
          title: loaded?.title ?? title ?? t("announcements.title"),
        }}
      />
      {loaded === null ? (
        <View style={styles.center}>
          {announcement === null ? (
            <ActivityIndicator size="large" color={colors.primary} />
          ) : (
            <Text style={{ color: colors.foreground }}>
              {announcement === "notFound"
                ? t("announcements.notFound")
                : t("announcements.loadFailed")}
            </Text>
          )}
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <Text
            accessibilityRole="header"
            style={[styles.title, { color: colors.foreground }]}
          >
            {loaded.title}
          </Text>
          <Text style={[styles.date, { color: colors.mutedForeground }]}>
            {formatAnnouncementDate(loaded.publishedAt, i18n.language)}
          </Text>
          <MarkdownView source={loaded.content} />
          <View style={styles.like}>
            <LikeToggle
              target={{
                kind: "announcement",
                slug: loaded.slug,
                locale: i18n.language,
              }}
              testID="announcement-like"
            />
          </View>
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
  },
  like: {
    marginTop: spacing.lg,
  },
  date: {
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
});
