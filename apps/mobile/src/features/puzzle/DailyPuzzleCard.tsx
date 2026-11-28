import { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { isBlackToMoveFromFen } from "@blindfold-chess/features/chess-core";

import { Button, Card, StaticBoard } from "../../components";
import { useFenSquares } from "../../components/use-fen-squares";
import { fontSize, fontWeight, spacing, useTheme } from "../../theme";
import { fetchPuzzleList, type PuzzleSummary } from "./puzzles-api";

/** The board's side, in points: the web's compact card (`w-32`). */
const BOARD_SIZE = 128;

/**
 * The home tab's "Daily Puzzle" — the web dashboard's card of the same name:
 * the day's board on the left, the caption, the puzzle's title and side to
 * move, and a button into the puzzle's page (`practice/puzzle/[id]`, the
 * same page the puzzle list opens).
 *
 * The puzzle is the one `GET /puzzles` names as `daily`, so the app and the
 * web show the same puzzle on the same day. It is read again whenever the
 * home tab comes into focus, since the server's pick changes at the UTC
 * date's turn and the tab can stay mounted across it.
 *
 * Renders nothing while loading, when the request fails, or when the server
 * has no daily puzzle (an empty pool) — the web's card also simply vanishes
 * then. A card that says "could not load" would only stand between the
 * player and the rest of home; the puzzle list in the practice tab is where
 * a failed load is reported.
 */
export function DailyPuzzleCard() {
  const [daily, setDaily] = useState<PuzzleSummary | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void fetchPuzzleList().then((result) => {
        // A failed refresh keeps the puzzle already shown instead of
        // dropping the card on a blip of the network.
        if (active && result !== "failed") setDaily(result.daily);
      });
      return () => {
        active = false;
      };
    }, []),
  );

  return daily ? <DailyPuzzleContent puzzle={daily} /> : null;
}

/**
 * The card itself, for a screen that already holds the day's puzzle: the
 * puzzle list draws the same card at its top, so home and the list show
 * the Daily Puzzle the same way. `testID` names the button.
 */
export function DailyPuzzleContent({
  puzzle,
  testID = "home-daily-puzzle",
}: {
  puzzle: PuzzleSummary;
  testID?: string;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const renderSquare = useFenSquares(puzzle.fen);

  return (
    <Card padding="none" style={styles.card}>
      <View style={styles.board}>
        <StaticBoard
          maxSize={BOARD_SIZE}
          showCoordinates={false}
          renderSquare={renderSquare}
        />
      </View>
      <View style={styles.body}>
        <View style={styles.text}>
          <Text style={[styles.eyebrow, { color: colors.mutedForeground }]}>
            {t("puzzle.daily")}
          </Text>
          <Text
            accessibilityRole="header"
            numberOfLines={2}
            style={[styles.title, { color: colors.foreground }]}
          >
            {puzzle.title}
          </Text>
          <Text style={[styles.side, { color: colors.mutedForeground }]}>
            {isBlackToMoveFromFen(puzzle.fen)
              ? t("puzzle.blackToMove")
              : t("puzzle.whiteToMove")}
          </Text>
        </View>
        <Button
          title={t("puzzle.detail.startSolving")}
          size="sm"
          style={styles.action}
          testID={testID}
          onPress={() =>
            router.push({
              pathname: "/practice/puzzle/[id]",
              params: { id: puzzle.id, title: puzzle.title },
            })
          }
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    padding: spacing.md,
    gap: spacing.md,
  },
  board: {
    width: BOARD_SIZE,
  },
  body: {
    flex: 1,
    minWidth: 0,
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  text: {
    gap: spacing.xs,
  },
  eyebrow: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  side: {
    fontSize: fontSize.sm,
  },
  action: {
    alignSelf: "flex-end",
  },
});
