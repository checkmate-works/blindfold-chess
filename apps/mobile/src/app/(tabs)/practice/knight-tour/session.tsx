import { useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, Alert } from "react-native";
import { useTranslation } from "react-i18next";
import { useRouter, useLocalSearchParams } from "expo-router";
import { isTourComplete } from "@blindfold-chess/features/knight-tour";
import { useKnightTour } from "@blindfold-chess/features/knight-tour/client";
import { isValidSquare } from "@blindfold-chess/features/common";

import { Button, Screen } from "../../../../components";
import {
  BlindMoveInput,
  KnightTourBoard,
  MoveHistory,
} from "../../../../features/knight-tour/components";
import {
  useTheme,
  spacing,
  fontSize,
  fontWeight,
  borderRadius,
  feedbackColors,
} from "../../../../theme";

const TOTAL_SQUARES = 64;

export default function KnightTourSession() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{
    startingSquare: string;
    blindfold: string;
  }>();

  // Same fallback as the web session page when the square is missing.
  const startingSquare =
    params.startingSquare && isValidSquare(params.startingSquare)
      ? params.startingSquare
      : "a1";
  const blindfold = params.blindfold === "1";

  const tour = useKnightTour({ initialStartingSquare: startingSquare });
  const { move, moveHistory, availableMoves } = tour;

  // The result screen rebuilds the tour from its visit order, so the path is
  // the only thing it needs.
  const finish = useCallback(
    (path: readonly string[]) => {
      router.replace({
        pathname: "/(tabs)/practice/knight-tour/result",
        params: { path: path.join(",") },
      });
    },
    [router],
  );

  const handleMove = useCallback(
    (square: string) => {
      const next = move(square);
      if (next && isTourComplete(next.visitedSquares)) {
        finish(next.moveHistory);
      }
    },
    [move, finish],
  );

  const handleQuit = () => {
    Alert.alert(
      t("knightTour.session.quitConfirmTitle"),
      t("knightTour.session.quitConfirmMessage"),
      [
        { text: t("knightTour.session.quitConfirmNo"), style: "cancel" },
        {
          text: t("knightTour.session.quitConfirmYes"),
          style: "destructive",
          onPress: () => finish(moveHistory),
        },
      ],
    );
  };

  const progress = tour.visitedSquares.size / TOTAL_SQUARES;
  const isStuck = availableMoves.length === 0;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.progressRow}>
          <View
            style={[styles.progressTrack, { backgroundColor: colors.muted }]}
          >
            <View
              style={[
                styles.progressFill,
                {
                  backgroundColor: colors.primary,
                  width: `${progress * 100}%`,
                },
              ]}
            />
          </View>
          <Text
            style={[styles.progressText, { color: colors.mutedForeground }]}
          >
            {tour.visitedSquares.size} / {TOTAL_SQUARES}
          </Text>
        </View>

        <View style={styles.position}>
          <Text
            style={[styles.positionLabel, { color: colors.mutedForeground }]}
          >
            {t("knightTour.session.currentPosition")}
          </Text>
          <Text
            style={[
              blindfold ? styles.positionBlind : styles.positionValue,
              { color: colors.foreground },
            ]}
          >
            {tour.currentSquare}
          </Text>
        </View>

        {isStuck ? (
          <View style={styles.stuck}>
            <Text style={styles.stuckTitle}>
              {t("knightTour.session.stuck")}
            </Text>
            <Text style={[styles.stuckHint, { color: colors.mutedForeground }]}>
              {t("knightTour.session.stuckHint")}
            </Text>
          </View>
        ) : blindfold ? (
          <BlindMoveInput
            visitedSquares={tour.visitedSquares}
            availableMoves={availableMoves}
            onMove={handleMove}
          />
        ) : (
          <KnightTourBoard
            currentSquare={tour.currentSquare}
            visitedSquares={tour.visitedSquares}
            tappableSquares={availableMoves}
            onSquarePress={handleMove}
          />
        )}

        <MoveHistory
          title={t("knightTour.session.moveHistory")}
          moves={moveHistory}
        />
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <Button
          title={t("knightTour.session.undo")}
          onPress={tour.undo}
          disabled={!tour.canUndo}
          variant="secondary"
          style={styles.footerButton}
        />
        <Button
          title={t("knightTour.session.quit")}
          onPress={handleQuit}
          variant="outline"
          style={styles.footerButton}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  progressTrack: {
    flex: 1,
    height: 8,
    borderRadius: borderRadius.full,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
  },
  progressText: {
    fontSize: fontSize.sm,
    fontVariant: ["tabular-nums"],
  },
  position: {
    alignItems: "center",
  },
  positionLabel: {
    fontSize: fontSize.sm,
    marginBottom: spacing.xs,
  },
  positionValue: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.bold,
  },
  // Blindfold mode has no board, so the square name is the whole picture.
  positionBlind: {
    fontSize: 48,
    fontWeight: fontWeight.bold,
  },
  stuck: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: feedbackColors.error,
    backgroundColor: feedbackColors.errorSoft,
    alignItems: "center",
    gap: spacing.xs,
  },
  stuckTitle: {
    color: feedbackColors.error,
    fontWeight: fontWeight.medium,
  },
  stuckHint: {
    fontSize: fontSize.sm,
    textAlign: "center",
  },
  footer: {
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
  },
  footerButton: {
    flex: 1,
  },
});
