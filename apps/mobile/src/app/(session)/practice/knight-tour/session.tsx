import { useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, Alert } from "react-native";
import { useTranslation } from "react-i18next";
import { useRouter, useLocalSearchParams } from "expo-router";
import { isTourComplete } from "@blindfold-chess/features/knight-tour";
import { useKnightTour } from "@blindfold-chess/features/knight-tour/client";
import { isValidSquare } from "@blindfold-chess/features/common";

import { BottomBar, Button, Screen } from "../../../../components";
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
  monoFont,
  withAlpha,
} from "../../../../theme";

const TOTAL_SQUARES = 64;

/**
 * The tour, stacked from the top as the web's `KnightTourPlayingLayout`:
 * the progress bar, the current square, the board (or, blindfolded, the
 * piece-and-coordinate keypad), the move history. Undo and Quit, which the
 * web puts at the end of that stack, are pinned in the bottom bar so they
 * stay in reach however far the history has grown.
 *
 * The header's × leaves without a result, like every session's; Quit asks,
 * then shows the result of the tour so far, as the web's does.
 */
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
        pathname: "/practice/knight-tour/result",
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

  const visited = tour.visitedSquares.size;
  const isStuck = availableMoves.length === 0;

  return (
    <Screen edges={["left", "right"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View>
          <Text
            style={[styles.progressText, { color: colors.mutedForeground }]}
          >
            {visited} / {TOTAL_SQUARES}
          </Text>
          <View
            style={[
              styles.progressTrack,
              { backgroundColor: colors.secondary },
            ]}
          >
            <View
              style={[
                styles.progressFill,
                {
                  backgroundColor: colors.foreground,
                  width: `${(visited / TOTAL_SQUARES) * 100}%`,
                },
              ]}
            />
          </View>
        </View>

        <View style={styles.position}>
          <Text
            style={[styles.positionLabel, { color: colors.mutedForeground }]}
          >
            {t("knightTour.session.currentPosition")}
          </Text>
          <Text
            style={[
              styles.positionValue,
              blindfold && styles.positionBlind,
              { color: colors.foreground },
            ]}
            testID="knight-tour-current"
          >
            {tour.currentSquare}
          </Text>
        </View>

        {isStuck ? (
          <View
            style={[
              styles.stuck,
              {
                backgroundColor: withAlpha(colors.destructive, 0.1),
                borderColor: withAlpha(colors.destructive, 0.2),
              },
            ]}
          >
            <Text style={[styles.stuckTitle, { color: colors.destructive }]}>
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

      <BottomBar style={styles.footer}>
        <Button
          title={t("knightTour.session.undo")}
          icon="arrow-undo"
          onPress={tour.undo}
          disabled={!tour.canUndo}
          variant="secondary"
          style={styles.footerButton}
          testID="knight-tour-undo"
        />
        <Button
          title={t("knightTour.session.quit")}
          onPress={handleQuit}
          style={[styles.footerButton, { backgroundColor: colors.destructive }]}
          textStyle={{ color: colors.destructiveForeground }}
          testID="knight-tour-quit"
        />
      </BottomBar>
    </Screen>
  );
}

/**
 * The web's sizes: blocks `gap-6` apart; the progress bar's `text-sm` count
 * `mb-2` over an `h-2` bar; the current square in `text-3xl` (`text-5xl`
 * blindfolded, where it is the whole picture) bold mono under its `text-sm`
 * label; the stuck box's `rounded-md p-4` with `mt-1` between its lines;
 * Undo and Quit `gap-2` apart.
 */
const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  progressText: {
    fontSize: fontSize.sm,
    fontVariant: ["tabular-nums"],
    marginBottom: spacing.sm,
  },
  progressTrack: {
    height: 8,
    borderRadius: borderRadius.full,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: borderRadius.full,
  },
  position: {
    alignItems: "center",
  },
  positionLabel: {
    fontSize: fontSize.sm,
    marginBottom: spacing.sm,
  },
  positionValue: {
    fontSize: 30,
    fontWeight: fontWeight.bold,
    fontFamily: monoFont,
  },
  positionBlind: {
    fontSize: 48,
  },
  stuck: {
    padding: spacing.md,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: "center",
    gap: spacing.xs,
  },
  stuckTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
  },
  stuckHint: {
    fontSize: fontSize.sm,
    textAlign: "center",
  },
  footer: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  footerButton: {
    flex: 1,
  },
});
