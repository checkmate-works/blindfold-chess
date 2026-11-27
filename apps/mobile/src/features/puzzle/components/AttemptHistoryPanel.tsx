import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import {
  borderRadius,
  fontSize,
  fontWeight,
  monoFont,
  spacing,
  useTheme,
  withAlpha,
} from "../../../theme";
import type {
  AttemptCell,
  AttemptRow,
  AttemptStatus,
} from "@blindfold-chess/features/puzzle";

/** The web's `CircleMarker`: ○ for White, ● for Black. */
export function SideMarker({ black }: { black: boolean }) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.marker,
        {
          borderColor: colors.foreground,
          backgroundColor: black ? colors.foreground : "transparent",
        },
      ]}
    />
  );
}

/**
 * The web's `AttemptHistoryPanel`: the solution in numbered White / Black
 * rows, the player's cells carrying each wrong try struck through in red
 * before the move found (green) or the answer shown (dashed, italic), the
 * opponent's replies in grey, and the author's notes after a move.
 */
export function AttemptHistoryPanel({ rows }: { rows: readonly AttemptRow[] }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  if (rows.length === 0) return null;

  return (
    <View style={[styles.panel, { borderColor: colors.border }]}>
      <View style={styles.headRow}>
        <View style={styles.number} />
        <View style={styles.headCell}>
          <SideMarker black={false} />
          <Text style={[styles.head, { color: colors.mutedForeground }]}>
            {t("puzzle.white")}
          </Text>
        </View>
        <View style={styles.headCell}>
          <SideMarker black />
          <Text style={[styles.head, { color: colors.mutedForeground }]}>
            {t("puzzle.black")}
          </Text>
        </View>
      </View>
      <View style={styles.body}>
        {rows.map((row) => (
          <View key={row.moveNumber} style={styles.row}>
            <Text
              style={[
                styles.number,
                styles.mono,
                { color: colors.mutedForeground },
              ]}
            >
              {row.moveNumber}.
            </Text>
            <Cell cell={row.white} />
            <Cell cell={row.black} />
          </View>
        ))}
      </View>
    </View>
  );
}

function Cell({ cell }: { cell: AttemptCell }) {
  const { t } = useTranslation();
  const { colors, feedbackColors } = useTheme();

  if (cell.kind === "empty") {
    return (
      <View style={styles.cell}>
        <Text style={[styles.mono, { color: colors.mutedForeground }]}>…</Text>
      </View>
    );
  }

  const note = cell.note ? (
    <Text style={[styles.note, { color: colors.mutedForeground }]}>
      {t("puzzle.result.note", { note: cell.note })}
    </Text>
  ) : null;

  if (cell.kind === "opponent") {
    return (
      <View style={styles.cell}>
        <Text style={[styles.mono, { color: colors.mutedForeground }]}>
          {cell.san}
        </Text>
        {note}
      </View>
    );
  }

  const revealedChip = (san: string) => (
    <Text
      style={[
        styles.chip,
        styles.mono,
        styles.revealed,
        { color: colors.mutedForeground, borderColor: colors.border },
      ]}
    >
      {san}
    </Text>
  );

  return (
    <View style={styles.cell}>
      <View style={styles.chips}>
        {cell.kind !== "skipped" &&
          cell.wrongMoves.map((move, i) => (
            <Text
              key={i}
              style={[
                styles.chip,
                styles.mono,
                styles.wrong,
                {
                  color: feedbackColors.error,
                  backgroundColor: withAlpha(feedbackColors.error, 0.08),
                },
              ]}
            >
              {move}
            </Text>
          ))}
        {cell.kind === "solved" ? (
          <Text
            style={[
              styles.chip,
              styles.mono,
              styles.correct,
              {
                color: feedbackColors.success,
                backgroundColor: withAlpha(feedbackColors.success, 0.12),
              },
            ]}
          >
            {cell.correctMove}
          </Text>
        ) : (
          revealedChip(cell.expectedMove)
        )}
      </View>
      {note}
    </View>
  );
}

/** The web's `AttemptStatusBadge`: solved (green), partial (amber), revealed (grey). */
export function AttemptStatusBadge({ status }: { status: AttemptStatus }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const tint =
    status.state === "solved"
      ? colors.success
      : status.state === "partial"
        ? colors.warning
        : null;
  const label =
    status.state === "solved"
      ? t("puzzle.result.statusSolved")
      : status.state === "partial"
        ? t("puzzle.result.statusPartial", {
            correct: status.correctCount,
            total: status.totalPlayerSteps,
          })
        : t("puzzle.result.statusRevealed");

  return (
    <Text
      testID="puzzle-status"
      style={[
        styles.badge,
        tint
          ? {
              color: tint,
              backgroundColor: withAlpha(tint, 0.1),
              borderColor: withAlpha(tint, 0.3),
            }
          : {
              color: colors.mutedForeground,
              backgroundColor: withAlpha(colors.muted, 0.6),
              borderColor: colors.border,
            },
      ]}
    >
      {label}
    </Text>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
  },
  headRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingTop: 12,
  },
  headCell: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.sm,
  },
  head: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  body: {
    padding: spacing.md,
    gap: spacing.xs,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  number: {
    width: 40,
    textAlign: "right",
    paddingRight: spacing.sm,
    fontSize: fontSize.sm,
    lineHeight: 22,
  },
  cell: {
    flex: 1,
    paddingHorizontal: spacing.sm,
    gap: 2,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  mono: {
    fontFamily: monoFont,
    fontSize: fontSize.sm,
    lineHeight: 22,
  },
  chip: {
    paddingHorizontal: 6,
    borderRadius: borderRadius.sm,
    overflow: "hidden",
  },
  wrong: {
    fontSize: fontSize.xs,
    textDecorationLine: "line-through",
    opacity: 0.8,
  },
  correct: {
    fontWeight: fontWeight.semibold,
  },
  revealed: {
    fontStyle: "italic",
    borderWidth: 1,
    borderStyle: "dashed",
  },
  note: {
    fontSize: fontSize.xs,
  },
  marker: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
  },
  badge: {
    alignSelf: "flex-end",
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    overflow: "hidden",
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
});
