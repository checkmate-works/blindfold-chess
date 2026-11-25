import { useCallback, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { isBlackToMoveFromFen } from "@blindfold-chess/features/chess-core";

import { ListIcon, ListRow, ListSection } from "../../../components";
import {
  fetchPuzzleList,
  type PuzzleSummary,
} from "../../../features/puzzle/puzzles-api";
import { spacing } from "../../../theme";

/**
 * Puzzles (the web's `/practice/puzzle`): the Daily Puzzle and the featured
 * set the operators picked. The app does not list the user-submitted pool,
 * so it shows no unmoderated user content (apps/mobile/CLAUDE.md).
 */
export default function PuzzleList() {
  const { t } = useTranslation();
  const router = useRouter();
  const [data, setData] = useState<
    { daily: PuzzleSummary | null; featured: PuzzleSummary[] } | "failed" | null
  >(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setData(await fetchPuzzleList());
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const open = (puzzle: PuzzleSummary) =>
    router.push({
      pathname: "/practice/puzzle/[id]",
      params: { id: puzzle.id, title: puzzle.title },
    });

  const row = (puzzle: PuzzleSummary, daily = false) => (
    <ListRow
      key={puzzle.id}
      testID={`puzzle-${puzzle.id}`}
      leading={<ListIcon glyph={daily ? "📅" : "🧩"} />}
      title={puzzle.title}
      subtitle={
        isBlackToMoveFromFen(puzzle.fen)
          ? t("puzzle.blackToMove")
          : t("puzzle.whiteToMove")
      }
      onPress={() => open(puzzle)}
    />
  );

  const daily = data && data !== "failed" ? data.daily : null;
  const featured =
    data && data !== "failed"
      ? data.featured.filter((p) => p.id !== daily?.id)
      : [];

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            await load();
            setRefreshing(false);
          }}
        />
      }
    >
      {data === null ? (
        <ListSection>
          <ListRow title={t("records.loading")} />
        </ListSection>
      ) : data === "failed" ? (
        <ListSection>
          <ListRow title={t("puzzle.loadFailed")} />
        </ListSection>
      ) : (
        <>
          {daily && (
            <ListSection title={t("puzzle.daily")}>
              {row(daily, true)}
            </ListSection>
          )}
          <ListSection
            title={t("puzzle.featured")}
            footer={t("puzzle.moreOnWeb")}
          >
            {featured.length > 0 ? (
              featured.map((p) => row(p))
            ) : (
              <ListRow title={t("puzzle.list.empty")} />
            )}
          </ListSection>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.md,
    gap: spacing.lg,
  },
});
