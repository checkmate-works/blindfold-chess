import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTranslation } from "react-i18next";
import { useLocalSearchParams, useRouter } from "expo-router";
import { replayMoves } from "@blindfold-chess/features/chess-core";
import { computeRecallStats } from "@blindfold-chess/features/recall";
import { SIDES, type Side } from "@blindfold-chess/types";

import { BottomBar, Button, Screen } from "../../../../components";
import { BoardViewModal } from "../../../../features/ai-game/components";
import { RecallMoveStrip } from "../../../../features/recall/components/RecallMoveStrip";
import { SegmentedBar } from "../../../../features/recall/components/SegmentedBar";
import { readRecallPgn } from "../../../../features/recall/lib/pgn";
import { decodeRecallLog } from "../../../../features/recall/lib/result-params";
import { positionOfEntry } from "../../../../features/recall/recall-state";
import { parseEnumParam } from "../../../../lib/route-params";
import { useCloseSession } from "../../../../navigation/use-close-session";
import { useReturnToGame } from "../../../../navigation/use-return-to-game";
import { fontSize, fontWeight, spacing, useTheme } from "../../../../theme";

/**
 * The recall summary (the web's `RecallSummary`, shown there under the
 * finished board): the recall rate with the first-try / stumbled /
 * couldn't-recall bar, the wrong-try count, and "By Move" — one marker per
 * move and per wrong try; tapping one opens the board at that point, as the
 * web's quick-peek does. "Play again" replays the same PGN from move 1;
 * the second button goes back to where the recall was started (the setup's
 * "Start with another PGN", the saved game, or the AI game it was opened
 * from, which is underneath in the same stack).
 */
export default function RecallResult() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const { close } = useCloseSession("/practice/recall");
  const params = useLocalSearchParams<{
    pgn: string;
    color: string;
    auto: string;
    from: string;
    log: string;
  }>();
  const backToGame = useReturnToGame({ from: params.from });
  const log = useMemo(() => decodeRecallLog(params.log), [params.log]);
  const stats = computeRecallStats(log);
  const game = useMemo(() => readRecallPgn(params.pgn ?? ""), [params.pgn]);
  const positions = useMemo(
    () => (game ? replayMoves(game.moves, game.startingFen) : []),
    [game],
  );
  const playerColor = parseEnumParam<Side>(params.color, SIDES, "white");
  const [peek, setPeek] = useState<number | null>(null);
  const peeked = peek === null ? null : positions[peek];

  const restart = () =>
    router.replace({
      pathname: "/practice/recall/session",
      params: {
        pgn: params.pgn,
        color: playerColor,
        auto: params.auto,
        from: params.from,
      },
    });

  return (
    <Screen edges={[]}>
      <ScrollView contentContainerStyle={styles.content}>
        {stats.total === 0 ? (
          <Text style={[styles.rate, { color: colors.foreground }]}>
            {t("recall.completed")}
          </Text>
        ) : (
          <View style={styles.report}>
            <Text style={[styles.rate, { color: colors.foreground }]}>
              {t("recall.summary.rateLabel")}:{" "}
              {(stats.recallRate * 100).toFixed(1)}% ({stats.recalled}/
              {stats.total})
            </Text>
            <SegmentedBar
              total={stats.total}
              segments={[
                {
                  key: "nailed",
                  value: stats.nailed,
                  color: colors.success,
                  label: t("recall.summary.nailed"),
                },
                {
                  key: "struggled",
                  value: stats.struggled,
                  color: colors.warning,
                  label: t("recall.summary.struggled"),
                },
                {
                  key: "missed",
                  value: stats.missed,
                  color: colors.destructive,
                  label: t("recall.summary.missed"),
                },
              ]}
            />
            {stats.mistakes > 0 && (
              <Text
                style={[styles.mistakes, { color: colors.mutedForeground }]}
              >
                {t("recall.summary.mistakes", { count: stats.mistakes })}
              </Text>
            )}
          </View>
        )}

        {log.length > 0 && (
          <View style={styles.review}>
            <View style={styles.reviewHeader}>
              <View style={styles.reviewTitleRow}>
                <Ionicons
                  name="list"
                  size={16}
                  color={colors.mutedForeground}
                />
                <Text
                  style={[styles.reviewTitle, { color: colors.foreground }]}
                >
                  {t("recall.summary.reviewTitle")}
                </Text>
              </View>
              <Text
                style={[styles.reviewHint, { color: colors.mutedForeground }]}
              >
                {t("recall.summary.reviewHint")}
              </Text>
            </View>
            <RecallMoveStrip
              log={log}
              onEntryPress={(index) => setPeek(positionOfEntry(log, index))}
            />
          </View>
        )}
      </ScrollView>

      <BottomBar style={styles.footer}>
        <Button
          title={t("recall.summary.restart")}
          icon="refresh"
          size="lg"
          fullWidth
          onPress={restart}
          testID="recall-restart"
        />
        <Button
          title={
            backToGame
              ? t("practiceResult.backToGame")
              : params.from === "setup"
                ? t("recall.summary.startNew")
                : t("common.back")
          }
          variant="secondary"
          size="lg"
          fullWidth
          onPress={backToGame ?? close}
          testID="recall-start-new"
        />
      </BottomBar>

      {peeked && (
        <BoardViewModal
          visible
          onClose={() => setPeek(null)}
          fen={peeked.fen}
          playerColor={playerColor}
          lastMove={peeked.lastMove ?? null}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.md,
    gap: spacing.lg,
  },
  report: {
    alignItems: "center",
    gap: 12,
  },
  // The web's `ScoreRateHeading`: `text-xl font-bold`, centred.
  rate: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    textAlign: "center",
  },
  mistakes: {
    fontSize: fontSize.xs,
  },
  review: {
    gap: spacing.sm,
  },
  reviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  reviewTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  reviewTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  reviewHint: {
    fontSize: fontSize.xs,
    flexShrink: 1,
    textAlign: "right",
  },
  footer: {
    gap: 12,
  },
});
