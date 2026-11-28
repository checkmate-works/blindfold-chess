import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import {
  formatSignedDelta,
  signedDeltaTone,
} from "@blindfold-chess/features/challenge-records";

import { ListIcon, ListRow, ListSection } from "../../components";
import { useOpenRootScreen } from "../../navigation/use-open-root-screen";
import {
  borderRadius,
  fontSize,
  fontWeight,
  useTheme,
  withAlpha,
} from "../../theme";
import { openWebPage } from "../../lib/web-pages";
import { leaderboardPath } from "../records/leaderboard-path";
import type { ChallengeResultSummary } from "./challenge-api";

type RecordCardProps = {
  record: ChallengeResultSummary["record"];
  /** The registry menu, which My Records opens on. */
  menuType: string;
  /** The run's leaderboard, whose web page each placement row opens. */
  leaderboardKey?: string;
  placements: ChallengeResultSummary["placements"];
};

/**
 * The web result's "Your record" card for a signed-in player: this run, the
 * last one and the best before it, with the change against the last run on
 * this run's row (the ticker order: the value, then its change) and a badge
 * for a first record or a new best under it, then a row into My Records,
 * which closes the session and opens My Records over the challenge's setup.
 *
 * Grouped rows rather than the web's card: three label–value lines and a
 * link are what the inset-grouped list is for. The rows always number three,
 * whatever the run was; a missing value is a dash, as on the web. The status and the values are the server's
 * (`deriveRecordView`), so the badge rule is decided in one place.
 *
 * Under them, one row per period the player is ranked in ("Leaderboard ·
 * This week — 9th"), each opening that board on the web. The web's result
 * page shows a preview of the board itself, other players included; the
 * app shows no other user, so it has only the player's own number and the
 * way out to the board.
 */
export function RecordCard({
  record,
  menuType,
  leaderboardKey,
  placements,
}: RecordCardProps) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const openRootScreen = useOpenRootScreen();

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
      {placements.map(({ period, rank }) => {
        const path =
          leaderboardKey === undefined
            ? undefined
            : leaderboardPath(period, menuType, leaderboardKey);
        return (
          <ListRow
            key={period}
            // ownRanks.periods.{all-time,weekly,monthly}
            title={t("challenge.recordCard.placement", {
              period: t(`ownRanks.periods.${period}`),
            })}
            value={t("ownRanks.rank", { rank })}
            accessory={path ? "external" : "none"}
            onPress={path ? () => openWebPage(path, i18n.language) : undefined}
            testID={`record-placement-${period}`}
          />
        );
      })}
      <ListRow
        leading={<ListIcon ionicon="trending-up" tint={colors.primary} />}
        title={t("challenge.recordCard.viewMyRecords")}
        onPress={() =>
          openRootScreen({ pathname: "/records", params: { menu: menuType } })
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
