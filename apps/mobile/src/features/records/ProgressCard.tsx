import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { useAuth } from "../../auth/use-auth";
import {
  useTheme,
  borderRadius,
  fontSize,
  fontWeight,
  spacing,
} from "../../theme";
import { rankLabel } from "./rank-label";

/**
 * The signed-in player's progress at the top of the home tab — username,
 * dojo rank, level and EXP, the summary the web's mypage leads with. Taps
 * through to their records. Renders nothing signed out or before the
 * account has loaded.
 *
 * A flat surface on the white page: a 1px `panelBorder` frame rather than a
 * hairline, which some devices render too faint to see on white, and no
 * shadow. Pressing changes only the fill (to `muted`), not the position or
 * opacity, like every other pressable surface.
 */
export function ProgressCard() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const { status, account } = useAuth();
  if (status !== "signedIn" || !account) return null;

  const stats = [
    {
      label: t("progress.rank"),
      value: account.highestRank
        ? rankLabel(account.highestRank, t)
        : t("progress.noRank"),
    },
    { label: t("progress.level"), value: `Lv ${account.level ?? 0}` },
    { label: "EXP", value: String(account.totalExp ?? 0) },
  ];

  return (
    <Pressable
      onPress={() => router.push("/records")}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: pressed ? colors.muted : colors.card,
          borderColor: colors.panelBorder,
        },
      ]}
    >
      <Text style={[styles.name, { color: colors.foreground }]}>
        {account.username ?? account.email ?? ""}
      </Text>
      <View style={styles.stats}>
        {stats.map((stat) => (
          <View key={stat.label} style={styles.stat}>
            <Text style={[styles.statValue, { color: colors.foreground }]}>
              {stat.value}
            </Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
              {stat.label}
            </Text>
          </View>
        ))}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.md,
  },
  name: {
    fontSize: 17,
    fontWeight: fontWeight.bold,
  },
  stats: {
    flexDirection: "row",
  },
  stat: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  statValue: {
    fontSize: 17,
    fontWeight: fontWeight.bold,
  },
  statLabel: {
    fontSize: fontSize.xs,
  },
});
