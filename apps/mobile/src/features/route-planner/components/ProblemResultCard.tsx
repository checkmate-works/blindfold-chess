import { View, Text, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { Card } from "../../../components";
import { useTheme, fontSize, fontWeight, spacing } from "../../../theme";
import { PIECE_DISPLAY_MAP } from "../lib/types";

type ProblemResultCardProps = {
  success: boolean;
  message: string;
  shortestPath: string[];
  piece: string;
  start: string;
  end: string;
};

export function ProblemResultCard({
  success,
  message,
  shortestPath,
  piece,
  start,
  end,
}: ProblemResultCardProps) {
  const { t } = useTranslation();
  const { colors, feedbackColors } = useTheme();

  const resultKey =
    message === "correct"
      ? "routePlanner.session.correct"
      : message === "skipped"
        ? "routePlanner.session.skipped"
        : "routePlanner.session.incorrect";

  return (
    <Card padding="lg">
      <View style={styles.container}>
        <Text style={styles.pieceIcon}>{PIECE_DISPLAY_MAP[piece]}</Text>

        <View style={styles.moveContainer}>
          <Text style={[styles.squareText, { color: colors.foreground }]}>
            {start}
          </Text>
          <Text style={[styles.arrow, { color: colors.mutedForeground }]}>
            {"\u2192"}
          </Text>
          <Text style={[styles.squareText, { color: colors.foreground }]}>
            {end}
          </Text>
        </View>

        <Text
          style={[
            styles.resultText,
            {
              color: success ? feedbackColors.success : feedbackColors.error,
            },
          ]}
        >
          {t(resultKey)}
        </Text>

        {!success && shortestPath.length > 0 && (
          <View style={styles.shortestPathSection}>
            <Text
              style={[
                styles.shortestPathLabel,
                { color: colors.mutedForeground },
              ]}
            >
              {t("routePlanner.session.shortestPath")}
            </Text>
            <View style={styles.pathContainer}>
              {shortestPath.map((sq, i) => (
                <View key={i} style={styles.pathStep}>
                  {i > 0 && (
                    <Text
                      style={[
                        styles.pathArrow,
                        { color: colors.mutedForeground },
                      ]}
                    >
                      {"\u2192"}
                    </Text>
                  )}
                  <Text
                    style={[styles.pathSquare, { color: colors.foreground }]}
                  >
                    {sq}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  pieceIcon: {
    fontSize: 36,
    marginBottom: spacing.sm,
  },
  moveContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  squareText: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    fontVariant: ["tabular-nums"],
  },
  arrow: {
    fontSize: fontSize.lg,
  },
  resultText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.md,
  },
  shortestPathSection: {
    alignItems: "center",
    gap: spacing.sm,
  },
  shortestPathLabel: {
    fontSize: fontSize.sm,
  },
  pathContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
  },
  pathStep: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  pathArrow: {
    fontSize: fontSize.sm,
  },
  pathSquare: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    fontVariant: ["tabular-nums"],
  },
});
