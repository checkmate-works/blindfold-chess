import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { useTranslation } from "react-i18next";

import { DoneMark } from "../../components/DoneMark";
import {
  practiceModuleRoute,
  type MobilePracticeModule,
} from "../../navigation/practice-modules";
import { borderRadius, fontWeight, spacing, useTheme } from "../../theme";
import type { PracticeProgressLabel } from "./practice-progress";
import { practiceModuleRank } from "./rank-filter";
import { PracticeCardVisual } from "./PracticeCardVisual";

type Props = {
  module: MobilePracticeModule;
  progress?: PracticeProgressLabel;
  title?: string;
};

/** One entry point to setup, shared by the catalogue and featured practices. */
export function PracticeCard({
  module,
  progress,
  title: titleOverride,
}: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  // practice.<i18nKey>.title / .description: the same keys as the module registry.
  const title = titleOverride ?? t(`practice.${module.i18nKey}.title`);
  const description = t(`practice.${module.i18nKey}.description`);
  const rank = practiceModuleRank(module);
  // ranks.names.mukyu, ranks.names.5kyu, ranks.names.4kyu,
  // ranks.names.3kyu, ranks.names.2kyu, ranks.names.1kyu, ranks.names.1dan
  const rankLabel = rank ? t(`ranks.names.${rank}`) : undefined;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[
        title,
        rankLabel,
        description,
        progress?.accessibilityLabel,
      ]
        .filter(Boolean)
        .join(", ")}
      testID={`practice-${module.slug}`}
      onPress={() =>
        router.push(`/practice/${practiceModuleRoute(module)}` as Href)
      }
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: pressed ? colors.muted : colors.card,
          borderColor: colors.panelBorder,
        },
      ]}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.foreground }]}>
          {title}
        </Text>
        <Ionicons
          name="chevron-forward"
          size={20}
          color={colors.mutedForeground}
        />
      </View>
      <PracticeCardVisual slug={module.slug} />
      <Text style={[styles.description, { color: colors.mutedForeground }]}>
        {description}
      </Text>
      {(rankLabel || progress) && (
        <View style={styles.footer}>
          {rankLabel && (
            <Text
              style={[
                styles.rank,
                {
                  color: colors.mutedForeground,
                  backgroundColor: colors.background,
                },
              ]}
            >
              {rankLabel}
            </Text>
          )}
          {progress && (
            <View style={styles.progress}>
              {progress.kind === "done" && <DoneMark size="sm" />}
              <Text
                style={[
                  styles.progressLabel,
                  { color: colors.mutedForeground },
                ]}
              >
                {progress.accessibilityLabel}
              </Text>
            </View>
          )}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    gap: 12,
  },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  title: {
    flex: 1,
    fontSize: 17,
    lineHeight: 24,
    fontWeight: fontWeight.semibold,
  },
  description: { fontSize: 14, lineHeight: 21 },
  footer: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  rank: {
    fontSize: 12,
    lineHeight: 18,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  progress: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    flexShrink: 1,
  },
  progressLabel: { fontSize: 12, lineHeight: 18, flexShrink: 1 },
});
