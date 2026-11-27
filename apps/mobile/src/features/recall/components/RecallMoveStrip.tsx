import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { formatMoveAnchor } from "@blindfold-chess/features/chess-core/move-numbering";

import {
  borderRadius,
  fontSize,
  monoFont,
  spacing,
  useTheme,
  withAlpha,
} from "../../../theme";
import type { MoveLogEntry } from "@blindfold-chess/features/recall";

type IndividualStatus = Exclude<MoveLogEntry["status"], "autoFilled">;

/** Legend label per square marker (wrong tries have their own). */
const SQUARE_LABEL_KEY = {
  correct: "recall.summary.nailed",
  skipped: "recall.summary.missed",
  auto: "recall.summary.legendAuto",
} as const;

/**
 * The web's `RecallMoveStrip`: one marker per log entry — a green square for
 * a first-try move, amber for "I don't know", grey for the opponent's
 * auto-played move, and a red pill carrying the wrong SAN for each wrong
 * try. The run "Auto-fill All" resolved folds into one "+N auto-filled"
 * chip. Tapping a marker calls `onEntryPress` with its index in the log.
 */
export function RecallMoveStrip({
  log,
  onEntryPress,
}: {
  log: readonly MoveLogEntry[];
  onEntryPress: (entryIndex: number) => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const markerColor: Record<IndividualStatus, string> = {
    correct: withAlpha(colors.success, 0.7),
    incorrect: withAlpha(colors.destructive, 0.7),
    skipped: withAlpha(colors.warning, 0.7),
    auto: withAlpha(colors.mutedForeground, 0.4),
  };

  const firstAutoFilled = log.findIndex((e) => e.status === "autoFilled");
  const autoFilledCount = log.filter((e) => e.status === "autoFilled").length;

  const legend: {
    key: string;
    color: string;
    round: boolean;
    label: string;
  }[] = (["correct", "incorrect", "skipped", "auto"] as const)
    .filter((status) => log.some((e) => e.status === status))
    .map((status) => ({
      key: status,
      color: markerColor[status],
      round: false,
      label:
        status === "incorrect"
          ? t("recall.summary.legendIncorrect")
          : t(SQUARE_LABEL_KEY[status]),
    }));
  if (autoFilledCount > 0) {
    legend.push({
      key: "autoFilled",
      color: colors.muted,
      round: true,
      label: t("recall.logAutoFilled"),
    });
  }

  return (
    <View style={styles.container}>
      <View style={styles.strip}>
        {log.map((entry, index) => {
          const status = entry.status;
          if (status === "autoFilled") return null;
          const prefix = formatMoveAnchor(entry.moveNumber, entry.isWhiteMove);
          if (status === "incorrect") {
            const label = `${prefix} ${t("recall.summary.triedMove", {
              move: entry.incorrectMove ?? "",
              correct: entry.move,
            })}`;
            return (
              <Pressable
                key={index}
                onPress={() => onEntryPress(index)}
                accessibilityRole="button"
                accessibilityLabel={label}
                hitSlop={4}
                style={({ pressed }) => [
                  styles.pill,
                  { backgroundColor: markerColor.incorrect },
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.pillText}>{entry.incorrectMove}</Text>
              </Pressable>
            );
          }
          return (
            <Pressable
              key={index}
              onPress={() => onEntryPress(index)}
              accessibilityRole="button"
              accessibilityLabel={`${prefix} ${entry.move} — ${t(
                SQUARE_LABEL_KEY[status],
              )}`}
              hitSlop={4}
              style={({ pressed }) => [
                styles.square,
                { backgroundColor: markerColor[status] },
                pressed && styles.pressed,
              ]}
            />
          );
        })}
        {autoFilledCount > 0 && (
          <Pressable
            onPress={() => onEntryPress(firstAutoFilled)}
            accessibilityRole="button"
            accessibilityLabel={t("recall.logAutoFilled")}
            style={({ pressed }) => [
              styles.chip,
              { backgroundColor: colors.muted },
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.chipText, { color: colors.mutedForeground }]}>
              {t("recall.summary.autoFilledCount", { count: autoFilledCount })}
            </Text>
          </Pressable>
        )}
      </View>
      <View style={styles.legend}>
        {legend.map((item) => (
          <View key={item.key} style={styles.legendItem}>
            <View
              style={[
                styles.legendSwatch,
                {
                  backgroundColor: item.color,
                  borderRadius: item.round ? borderRadius.full : 2,
                },
              ]}
            />
            <Text
              style={[styles.legendText, { color: colors.mutedForeground }]}
            >
              {item.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  strip: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: spacing.xs,
  },
  // 20pt markers (`h-5 w-5 rounded-sm`), a touch target with the hit slop.
  square: {
    width: 20,
    height: 20,
    borderRadius: 2,
  },
  pill: {
    height: 20,
    borderRadius: 2,
    paddingHorizontal: 6,
    justifyContent: "center",
  },
  pillText: {
    color: "#ffffff",
    fontFamily: monoFont,
    fontSize: fontSize.xs,
  },
  chip: {
    height: 20,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    justifyContent: "center",
  },
  chipText: {
    fontSize: fontSize.xs,
  },
  pressed: {
    transform: [{ scale: 1.1 }],
  },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    columnGap: 12,
    rowGap: spacing.xs,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  legendSwatch: {
    width: 12,
    height: 12,
  },
  // The web's `text-[0.65rem]`, rounded up to stay legible.
  legendText: {
    fontSize: 11,
  },
});
