import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import type { MobileAccount } from "../../auth/account";
import { fontSize, fontWeight, useTheme } from "../../theme";
import { rankLabel } from "./rank-label";

/** The parts of the account the stats read. */
export type AccountStatsInput = Pick<
  MobileAccount,
  "highestRank" | "level" | "totalExp"
>;

/**
 * Dojo rank, level and EXP in three equal columns — the summary the web's
 * mypage leads with. Shared by the home tab's progress card and mypage's
 * heading, so the two never disagree on what they show.
 */
export function AccountStats({ account }: { account: AccountStatsInput }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
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
  );
}

const styles = StyleSheet.create({
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
