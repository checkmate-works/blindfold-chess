import { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { useLocalSearchParams } from "expo-router";
import {
  knightTourStateFromPath,
  summarizeKnightTour,
} from "@blindfold-chess/features/knight-tour";

import { PracticeResultScreen } from "../../../../components";
import { RelatedArticlesSection } from "../../../../features/learn/RequiredKnowledgeSection";
import {
  KnightTourBoard,
  RELATED_ARTICLE_PIECES,
  RELATED_ARTICLES,
} from "../../../../features/knight-tour/components";
import { useTheme, spacing, fontSize, fontWeight } from "../../../../theme";

const NO_SQUARES: readonly string[] = [];

/**
 * The web's `KnightTourResult`: the squares visited out of 64, the
 * success note for a full tour (closed or open), the final board with every
 * square numbered, then the related articles the web lists under "Related
 * Learning". The ways out are the shared result footer's.
 */
export default function KnightTourResult() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ path?: string }>();

  // Replaying the path re-validates every move, so a hand-edited deep link
  // cannot claim a tour that was never played.
  const summary = useMemo(
    () =>
      summarizeKnightTour(
        knightTourStateFromPath(params.path ? params.path.split(",") : []),
      ),
    [params.path],
  );

  return (
    <PracticeResultScreen setupHref="/practice/knight-tour">
      <View style={styles.stack}>
        <View>
          <Text
            style={[styles.score, { color: colors.foreground }]}
            testID="knight-tour-squares-visited"
          >
            {t("knightTour.result.squaresVisited")}:{" "}
            {summary.visitedSquares.size} / 64
          </Text>

          {summary.success && (
            <View style={styles.message}>
              <Text style={[styles.successTitle, { color: colors.foreground }]}>
                {t("knightTour.result.success")}
              </Text>
              <Text
                style={[styles.successText, { color: colors.mutedForeground }]}
              >
                {summary.isClosedTour
                  ? t("knightTour.result.closedTourMessage")
                  : t("knightTour.result.openTourMessage")}
              </Text>
            </View>
          )}

          <KnightTourBoard
            currentSquare={summary.lastSquare}
            visitedSquares={summary.visitedSquares}
            tappableSquares={NO_SQUARES}
            showMoveNumbers
          />
        </View>

        <RelatedArticlesSection
          slugs={RELATED_ARTICLES}
          pieces={RELATED_ARTICLE_PIECES}
        />
      </View>
    </PracticeResultScreen>
  );
}

/**
 * The web's sizes: the count as a `text-2xl` bold heading `mb-6`, the
 * success note's `text-lg` medium title `mb-2` over its muted line, `mb-6`
 * before the board, and the articles `mt-8` below it.
 */
const styles = StyleSheet.create({
  stack: {
    gap: spacing.xl,
  },
  score: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    textAlign: "center",
    marginBottom: spacing.lg,
  },
  message: {
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  successTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.medium,
  },
  successText: {
    fontSize: fontSize.md,
    textAlign: "center",
  },
});
