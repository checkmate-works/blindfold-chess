import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  formatSignedDelta,
  signedDeltaTone,
} from "@blindfold-chess/features/challenge-records";

import { ListIcon, ListRow, ListSection } from "../../components";
import {
  borderRadius,
  fontSize,
  fontWeight,
  useTheme,
  withAlpha,
} from "../../theme";
import type { ChallengeResultSummary } from "./challenge-api";

type RecordCardProps = {
  record: ChallengeResultSummary["record"];
  /** The registry menu, which My Records opens on. */
  menuType: string;
};

/**
 * The web result's "Your record" card for a signed-in player: this run, the
 * last one and the best before it, with the change against the last run on
 * this run's row (the ticker order: the value, then its change) and a badge
 * for a first record or a new best under it, then a row into My Records.
 *
 * Grouped rows rather than the web's card: three label–value lines and a
 * link are what the inset-grouped list is for. The rows always number three,
 * whatever the run was; a missing value is a dash, as on the web. The status and the values are the server's
 * (`deriveRecordView`), so the badge rule is decided in one place.
 */
export function RecordCard({ record, menuType }: RecordCardProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();

  const formatScore = (score: number | undefined) =>
    score === undefined ? "—" : t("challenge.recordCard.scoreValue", { score });

  const toneColor = {
    up: colors.success,
    down: colors.destructive,
    flat: colors.mutedForeground,
  };
  const badge =
    record.status === "new-best"
      ? {
          label: t("challenge.recordCard.newBest"),
          color: colors.success,
          fill: withAlpha(colors.success, 0.12),
        }
      : record.status === "first"
        ? {
            label: t("challenge.recordCard.firstRecord"),
            color: colors.mutedForeground,
            fill: colors.muted,
          }
        : null;

  return (
    <ListSection title={t("challenge.recordCard.title")}>
      <ListRow
        title={t("challenge.recordCard.thisTime")}
        trailing={
          <View style={styles.current}>
            <View style={styles.valueLine}>
              <Text style={[styles.value, { color: colors.foreground }]}>
                {formatScore(record.currentScore)}
              </Text>
              {record.diffFromLast !== undefined && (
                <Text
                  style={[
                    styles.delta,
                    { color: toneColor[signedDeltaTone(record.diffFromLast)] },
                  ]}
                >
                  {formatSignedDelta(record.diffFromLast)}
                </Text>
              )}
            </View>
            {badge && (
              <View style={[styles.badge, { backgroundColor: badge.fill }]}>
                <Text style={[styles.badgeText, { color: badge.color }]}>
                  {badge.label}
                </Text>
              </View>
            )}
          </View>
        }
        testID="record-this-time"
      />
      <ListRow
        title={t("challenge.recordCard.previousLast")}
        value={formatScore(record.previousLastScore)}
      />
      <ListRow
        title={t("challenge.recordCard.previousBest")}
        value={formatScore(record.previousBestScore)}
      />
      <ListRow
        leading={<ListIcon ionicon="trending-up" tint={colors.primary} />}
        title={t("challenge.recordCard.viewMyRecords")}
        onPress={() =>
          router.push({ pathname: "/records", params: { menu: menuType } })
        }
        testID="record-view-my-records"
      />
    </ListSection>
  );
}

const styles = StyleSheet.create({
  // The badge goes under the value rather than beside it, so the row's
  // label keeps its line on a narrow phone.
  current: {
    alignItems: "flex-end",
    gap: 4,
    flexShrink: 1,
  },
  valueLine: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
  },
  badge: {
    borderRadius: borderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 2,
    flexShrink: 1,
  },
  badgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  value: {
    fontSize: 15,
    fontWeight: fontWeight.semibold,
    fontVariant: ["tabular-nums"],
  },
  delta: {
    fontSize: fontSize.xs,
    fontVariant: ["tabular-nums"],
  },
});
