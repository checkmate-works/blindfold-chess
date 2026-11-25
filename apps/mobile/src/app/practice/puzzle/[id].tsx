import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { isBlackToMoveFromFen } from "@blindfold-chess/features/chess-core";

import { BottomBar, Button, ListSection, Screen } from "../../../components";
import { BoardAccordion } from "../../../features/puzzle/components/BoardAccordion";
import { PiecesInfo } from "../../../features/puzzle/components/PiecesInfo";
import { fetchPuzzle, type Puzzle } from "../../../features/puzzle/puzzles-api";
import { fontSize, spacing, useTheme } from "../../../theme";

/**
 * A puzzle's page (the web's `/practice/puzzle/[id]`): "About This Puzzle"
 * with the author's description, the pieces as text, the board behind a
 * "Show Board" accordion (not counted as a peek here, as on the web), and
 * "Start solving" in the footer. The web's other uses of the position
 * (memorize only, a new game from here), author, likes, other puzzles and
 * comments are not ported: the app shows no other user's content.
 */
export default function PuzzleDetail() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const { id, title } = useLocalSearchParams<{ id: string; title?: string }>();
  const [puzzle, setPuzzle] = useState<Puzzle | "notFound" | "failed" | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;
    void fetchPuzzle(id ?? "").then((result) => {
      if (!cancelled) setPuzzle(result);
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const loaded = puzzle !== null && typeof puzzle !== "string" ? puzzle : null;

  return (
    <Screen edges={[]}>
      <Stack.Screen
        options={{ title: loaded?.title ?? title ?? t("puzzle.title") }}
      />
      {loaded === null ? (
        <View style={styles.center}>
          {puzzle === null ? (
            <ActivityIndicator size="large" color={colors.primary} />
          ) : (
            <Text style={{ color: colors.foreground }}>
              {t("puzzle.loadFailed")}
            </Text>
          )}
        </View>
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.content}>
            {loaded.description ? (
              <ListSection title={t("puzzle.detail.descriptionSection")}>
                <Text
                  style={[styles.description, { color: colors.foreground }]}
                >
                  {loaded.description}
                </Text>
              </ListSection>
            ) : null}
            <PiecesInfo fen={loaded.fen} />
            <BoardAccordion
              fen={loaded.fen}
              flipped={isBlackToMoveFromFen(loaded.fen)}
              maxSize={width - BOARD_INSET}
              testID="puzzle-detail-board"
            />
          </ScrollView>
          <BottomBar>
            <Button
              title={t("puzzle.detail.startSolving")}
              icon="play"
              size="lg"
              fullWidth
              testID="puzzle-start"
              onPress={() =>
                router.push({
                  pathname: "/practice/puzzle/session",
                  params: { id: loaded.id },
                })
              }
            />
          </BottomBar>
        </>
      )}
    </Screen>
  );
}

/** The page's padding on both sides and the accordion's border. */
const BOARD_INSET = spacing.md * 2 + 2;

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    padding: spacing.md,
    gap: spacing.lg,
  },
  description: {
    fontSize: fontSize.md,
    lineHeight: 22,
    padding: spacing.md,
  },
});
