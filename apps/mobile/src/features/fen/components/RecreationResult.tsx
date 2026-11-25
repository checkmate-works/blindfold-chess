import { useMemo } from "react";
import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import {
  calculateSquareDifferences,
  type PositionAccuracy,
  type SquareStatus,
} from "@blindfold-chess/features/common";

import { Button } from "../../../components";
import {
  useTheme,
  fontSize,
  fontWeight,
  spacing,
  withAlpha,
} from "../../../theme";
import { FenBoard } from "./FenBoard";

/**
 * The web overlay's fixed Tailwind tints (`green-500/40`, `red-500/50`,
 * `yellow-500/40`), not theme colours: they sit over the board's own
 * squares, whose colours come from the board theme, not the app theme.
 */
const SQUARE_TINTS: Record<SquareStatus, string> = {
  correct: "rgba(34, 197, 94, 0.4)",
  incorrect: "rgba(239, 68, 68, 0.5)",
  missing: "rgba(234, 179, 8, 0.4)",
};

/** "Accuracy: 87.5% (7/8)", the web's heading for a problem and for a run. */
export function accuracyHeading(
  t: ReturnType<typeof useTranslation>["t"],
  accuracy: number,
  correct: number,
  total: number,
): string {
  return `${t("fen.problemResult.accuracy")}: ${accuracy.toFixed(1)}% (${correct}/${total})`;
}

/** Piece counts the progress bar splits, per problem or summed over a run. */
export type PieceCounts = {
  correctPieces: number;
  incorrectPieces: number;
  missingPieces: number;
  extraPieces: number;
  totalPieces: number;
};

/**
 * The web's `PieceRecreationProgress`: "Recreation Progress" over an `h-8`
 * bar split into correct / incorrect / missing (empty segments left out),
 * a legend under it, and a note for extra pieces, which have no square in
 * the original and so no place in the bar.
 */
export function RecreationProgress({
  counts,
  compact = false,
}: {
  counts: PieceCounts;
  /** The problem list's smaller bar: no heading, `h-6`, `text-xs` numbers. */
  compact?: boolean;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const segments = [
    {
      key: "correct",
      value: counts.correctPieces,
      color: colors.success,
      label: t("fen.problemResult.correct"),
    },
    {
      key: "incorrect",
      value: counts.incorrectPieces,
      color: colors.destructive,
      label: t("fen.problemResult.incorrect"),
    },
    {
      key: "missing",
      value: counts.missingPieces,
      // `bg-muted-foreground/40`.
      color: withAlpha(colors.mutedForeground, 0.4),
      label: t("fen.problemResult.missing"),
    },
  ];

  return (
    <View>
      {!compact && (
        <Text style={[styles.caption, { color: colors.mutedForeground }]}>
          {t("fen.problemResult.recreationProgress")}
        </Text>
      )}
      <View
        style={[
          compact ? styles.barCompact : styles.bar,
          { backgroundColor: colors.muted },
        ]}
      >
        {segments
          .filter((s) => s.value > 0)
          .map((s) => (
            <View
              key={s.key}
              style={[
                styles.segment,
                {
                  backgroundColor: s.color,
                  width: `${(s.value / Math.max(counts.totalPieces, 1)) * 100}%`,
                },
              ]}
            >
              <Text
                style={compact ? styles.segmentTextCompact : styles.segmentText}
              >
                {s.value}
              </Text>
            </View>
          ))}
      </View>
      <View style={styles.legend}>
        {segments.map((s) => (
          <View key={s.key} style={styles.legendItem}>
            <View
              style={[
                compact ? styles.swatchCompact : styles.swatch,
                { backgroundColor: s.color },
              ]}
            />
            <Text style={[styles.legendText, { color: colors.foreground }]}>
              {s.label}: {s.value}
            </Text>
          </View>
        ))}
      </View>
      {counts.extraPieces > 0 && (
        <Text style={[styles.extra, { color: colors.mutedForeground }]}>
          {t("fen.problemResult.extra")}:{" "}
          <Text style={styles.extraCount}>+{counts.extraPieces}</Text>
          {compact ? "" : ` (${t("fen.problemResult.extraDescription")})`}
        </Text>
      )}
    </View>
  );
}

/**
 * The player's board with each square marked correct / wrong / missing
 * against the original, as the web's `ChessBoardWithOverlay`.
 */
export function RecreationBoard({
  originalFen,
  recreatedFen,
  flipped,
  ...boardProps
}: {
  originalFen: string;
  recreatedFen: string;
  flipped: boolean;
  maxSize?: number;
  horizontalInset?: number;
  showCoordinates?: boolean;
}) {
  const statusBySquare = useMemo(
    () =>
      new Map(
        calculateSquareDifferences(originalFen, recreatedFen).map((d) => [
          d.square,
          d.status,
        ]),
      ),
    [originalFen, recreatedFen],
  );
  return (
    <FenBoard
      fen={recreatedFen}
      flipped={flipped}
      squareTint={(square) => {
        const status = statusBySquare.get(square);
        return status && SQUARE_TINTS[status];
      }}
      {...boardProps}
    />
  );
}

type ProblemRecreationResultProps = {
  accuracy: PositionAccuracy;
  originalFen: string;
  recreatedFen: string;
  flipped: boolean;
  isLastProblem: boolean;
  onNextProblem: () => void;
  onViewResults: () => void;
  /** Buttons under the main one (position memory's "Analyze on Lichess"). */
  extraActions?: ReactNode;
};

/**
 * What both drills show after a problem, the web's
 * `ProblemRecreationSections`: the accuracy heading, the recreation
 * progress, the original and the player's board (stacked, as the web's
 * grid is on a phone), then the button that moves on — "View Results"
 * after the last problem, "Next Problem" before it.
 */
export function ProblemRecreationResult({
  accuracy,
  originalFen,
  recreatedFen,
  flipped,
  isLastProblem,
  onNextProblem,
  onViewResults,
  extraActions,
}: ProblemRecreationResultProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <View style={styles.result}>
      <Text style={[styles.heading, { color: colors.foreground }]}>
        {accuracyHeading(
          t,
          accuracy.accuracy,
          accuracy.correctPieces,
          accuracy.totalPieces,
        )}
      </Text>

      <RecreationProgress counts={accuracy} />

      <View style={styles.boards}>
        <View>
          <Text style={[styles.caption, { color: colors.mutedForeground }]}>
            {t("fen.problemResult.original")}
          </Text>
          <FenBoard fen={originalFen} flipped={flipped} />
        </View>
        <View>
          <Text style={[styles.caption, { color: colors.mutedForeground }]}>
            {t("fen.problemResult.yourRecreation")}
          </Text>
          <RecreationBoard
            originalFen={originalFen}
            recreatedFen={recreatedFen}
            flipped={flipped}
          />
        </View>
      </View>

      <View style={styles.actions}>
        {isLastProblem ? (
          <Button
            title={t("fen.problemResult.viewResults")}
            onPress={onViewResults}
            size="lg"
            fullWidth
            testID="view-results"
          />
        ) : (
          <Button
            title={t("fen.problemResult.nextProblem")}
            onPress={onNextProblem}
            size="lg"
            fullWidth
            testID="next-problem"
          />
        )}
        {extraActions}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // The web's `gap-6` column.
  result: {
    gap: spacing.lg,
  },
  // `text-2xl font-bold text-center`.
  heading: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    textAlign: "center",
  },
  // `text-sm font-medium text-muted-foreground mb-2`.
  caption: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    marginBottom: spacing.sm,
  },
  // `h-8 rounded-lg`.
  bar: {
    flexDirection: "row",
    height: 32,
    borderRadius: 8,
    overflow: "hidden",
  },
  // `h-6 rounded`.
  barCompact: {
    flexDirection: "row",
    height: 24,
    borderRadius: 4,
    overflow: "hidden",
  },
  segment: {
    alignItems: "center",
    justifyContent: "center",
  },
  segmentText: {
    color: "#ffffff",
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  segmentTextCompact: {
    color: "#ffffff",
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  legend: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.sm,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  swatch: {
    width: 12,
    height: 12,
    borderRadius: 4,
  },
  swatchCompact: {
    width: 8,
    height: 8,
    borderRadius: 2,
  },
  legendText: {
    fontSize: fontSize.xs,
  },
  extra: {
    fontSize: fontSize.xs,
    marginTop: spacing.sm + 4,
  },
  extraCount: {
    fontWeight: fontWeight.semibold,
  },
  // `grid-cols-1 gap-4`.
  boards: {
    gap: spacing.md,
  },
  // `space-y-3`.
  actions: {
    gap: 12,
  },
});
