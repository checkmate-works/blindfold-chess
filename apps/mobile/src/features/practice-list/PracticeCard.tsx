import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { useTranslation } from "react-i18next";
import type { RankSlug } from "@blindfold-chess/features/dojo-ranks";

import { DoneMark } from "../../components/DoneMark";
import {
  practiceModuleRoute,
  type MobilePracticeModule,
} from "../../navigation/practice-modules";
import { borderRadius, fontWeight, spacing, useTheme } from "../../theme";
import { RankPill } from "../dojo/RankPill";
import type { PracticeProgressLabel } from "./practice-progress";
import { practiceModuleRank } from "./rank-filter";
import { PracticeCardVisual } from "./PracticeCardVisual";

type Props = {
  module: MobilePracticeModule;
  progress?: PracticeProgressLabel;
  title?: string;
  /**
   * Makes the rank pill a button that opens the rank's introduction
   * (`RankSheet`). Left out, the pill is only a label.
   */
  onRankPress?: (rank: RankSlug) => void;
};

/**
 * One entry point to setup, shared by the catalogue and featured practices.
 *
 * @description
 * Laid out like a phone app's link card and kept short, so a screen holds
 * several: the title with the rank's belt pill beside it, the worked
 * example, then one footer line — the progress mark on the left ("Tried",
 * or "Tried n / N" for a practice with several challenges on its rank) and
 * "Details ›" on the right, which says the card opens a page rather than
 * starting a run. The description is not drawn (the setup screen opens
 * with it) but is still read out with the card.
 *
 * The pill is the card's only other target: with `onRankPress` it opens
 * the rank's introduction instead of the setup.
 */
export function PracticeCard({
  module,
  progress,
  title: titleOverride,
  onRankPress,
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
        {rank && rankLabel && (
          <RankPill
            slug={rank}
            label={rankLabel}
            onPress={onRankPress ? () => onRankPress(rank) : undefined}
            accessibilityLabel={t("practice.rankSheet.pillLabel", {
              rank: rankLabel,
            })}
          />
        )}
      </View>
      <PracticeCardVisual slug={module.slug} />
      <View style={[styles.footer, progress && styles.footerWithMark]}>
        {progress && (
          // A finished single challenge is the green "done" chip; a count
          // ("Tried 1 / 3") is still under way, so it stays neutral.
          <View
            style={[
              styles.progress,
              {
                backgroundColor:
                  progress.kind === "done" ? colors.successSoft : colors.muted,
              },
            ]}
          >
            {progress.kind === "done" && <DoneMark size="sm" />}
            <Text
              style={[
                styles.progressLabel,
                {
                  color:
                    progress.kind === "done"
                      ? colors.successSoftForeground
                      : colors.mutedForeground,
                },
              ]}
            >
              {progress.accessibilityLabel}
            </Text>
          </View>
        )}
        <View style={styles.detail}>
          <Text style={[styles.detailLabel, { color: colors.primary }]}>
            {t("practice.details")}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={colors.primary} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    gap: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  title: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: fontWeight.bold,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: spacing.sm,
  },
  footerWithMark: { justifyContent: "space-between" },
  progress: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    minHeight: 24,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
    flexShrink: 1,
  },
  progressLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: fontWeight.bold,
    flexShrink: 1,
  },
  detail: { flexDirection: "row", alignItems: "center" },
  detailLabel: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: fontWeight.semibold,
  },
});
