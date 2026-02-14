import { View, Text, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { Card } from "../../../components";
import { useTheme, fontSize, fontWeight, spacing } from "../../../theme";
import type { RoutePlannerProblem } from "../lib/types";
import { PIECE_DISPLAY_MAP } from "../lib/types";

type ProblemCardProps = {
  problem: RoutePlannerProblem;
  moves: string[];
  currentIndex: number;
  totalCount: number;
};

export function ProblemCard({
  problem,
  moves,
  currentIndex,
  totalCount,
}: ProblemCardProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <Card padding="lg">
      <View style={styles.container}>
        {/* Progress */}
        {totalCount > 1 && (
          <Text style={[styles.progress, { color: colors.mutedForeground }]}>
            {t("routePlanner.session.progress", {
              current: currentIndex + 1,
              total: totalCount,
            })}
          </Text>
        )}

        {/* Piece icon */}
        <Text style={styles.pieceIcon}>{PIECE_DISPLAY_MAP[problem.piece]}</Text>
        <Text style={[styles.pieceName, { color: colors.mutedForeground }]}>
          {t(`routePlanner.pieces.${problem.piece}`)}
        </Text>

        {/* Start -> End */}
        <View style={styles.moveContainer}>
          <View
            style={[styles.squareBadge, { backgroundColor: colors.secondary }]}
          >
            <Text style={[styles.squareText, { color: colors.foreground }]}>
              {problem.start}
            </Text>
          </View>
          <Text style={[styles.arrow, { color: colors.mutedForeground }]}>
            {"\u2192"}
          </Text>
          <View
            style={[styles.squareBadge, { backgroundColor: colors.secondary }]}
          >
            <Text style={[styles.squareText, { color: colors.foreground }]}>
              {problem.end}
            </Text>
          </View>
        </View>

        {/* Path display */}
        <View style={styles.pathContainer}>
          <Text style={[styles.pathSquare, { color: colors.mutedForeground }]}>
            {problem.start}
          </Text>
          {moves.map((move, i) => (
            <View key={i} style={styles.pathStep}>
              <Text
                style={[styles.pathArrow, { color: colors.mutedForeground }]}
              >
                {"\u2192"}
              </Text>
              <View
                style={[
                  styles.pathBadge,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={[styles.pathSquare, { color: colors.foreground }]}>
                  {move}
                </Text>
              </View>
            </View>
          ))}
          <Text style={[styles.pathArrow, { color: colors.mutedForeground }]}>
            {"\u2192"}
          </Text>
          <Text
            style={[
              styles.pathSquare,
              { color: colors.mutedForeground, opacity: 0.5 },
            ]}
          >
            {problem.end}
          </Text>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  progress: {
    fontSize: fontSize.sm,
    marginBottom: spacing.sm,
  },
  pieceIcon: {
    fontSize: 48,
    marginBottom: spacing.xs,
  },
  pieceName: {
    fontSize: fontSize.md,
    marginBottom: spacing.md,
  },
  moveContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  squareBadge: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 8,
  },
  squareText: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
  },
  arrow: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
  },
  pathContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: spacing.sm,
  },
  pathStep: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  pathBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  pathSquare: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    fontVariant: ["tabular-nums"],
  },
  pathArrow: {
    fontSize: fontSize.sm,
  },
});
