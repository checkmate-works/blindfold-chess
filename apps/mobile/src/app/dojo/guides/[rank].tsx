import { useRef, useState } from "react";
import { ScrollView, StyleSheet, Text } from "react-native";
import type { ScrollViewInstance } from "react-native";
import { Stack, router, useLocalSearchParams, type Href } from "expo-router";
import { useTranslation } from "react-i18next";
import { isRankSlug } from "@blindfold-chess/features/dojo-ranks";

import {
  BottomBar,
  Button,
  ListIcon,
  ListRow,
  ListSection,
  Screen,
} from "../../../components";
import { GuidePageView } from "../../../features/guides/GuidePageView";
import {
  adjacentGuideRanks,
  formatWebMessage,
  guideContent,
} from "../../../features/guides/content";
import { fontSize, fontWeight, spacing, useTheme } from "../../../theme";

/**
 * Rank Guide (段級位別教本)
 *
 * @description
 * A rank's guide, read in the app: the web's pages of prose with their
 * boards, tables and link cards, drawn natively from the bundled copy
 * (`features/guides`). Every guide is the web's flat format — pages in
 * order, no chapters.
 *
 * Read page by page, with Previous / Next pinned under the text, not as one
 * long scroll. The web's page breaks are the author's: each page is one
 * step of the lesson and ends where the next one needs a fresh look at the
 * board, so running them together loses the pauses the text was written
 * around. It also keeps a screen to one page's boards — the 3kyu guide
 * draws eighteen, each 64 squares of views — instead of mounting every
 * page at once. A swipe-between-pages pager was the other native option;
 * it fights the vertical scroll inside a long page, and its page dots say
 * less than "3 / 8". Changing page scrolls back to the top, as turning a
 * page does.
 *
 * @flow
 * 1. Opened from the rank screen's guide row, or from another guide's link.
 * 2. Previous / Next step through the pages; the last page offers the
 *    neighbouring ranks' guides, as the web's last page does.
 */
export default function GuideScreen() {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const { rank } = useLocalSearchParams<{ rank: string }>();
  const [pageIndex, setPageIndex] = useState(0);
  const scrollRef = useRef<ScrollViewInstance>(null);
  const content = guideContent(i18n.language);
  const guide = isRankSlug(rank) ? content.guides[rank] : undefined;
  if (!isRankSlug(rank) || !guide) return null;

  const pages = guide.pages;
  const page = pages[pageIndex] ?? pages[0];
  const isLast = pageIndex === pages.length - 1;
  const rankName = t(`ranks.names.${rank}`);
  const { prev, next } = adjacentGuideRanks(rank);

  const turn = (delta: number) => {
    setPageIndex((i) => Math.min(Math.max(i + delta, 0), pages.length - 1));
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  };

  return (
    <Screen edges={pages.length > 1 ? [] : ["bottom"]}>
      <Stack.Screen
        options={{
          title: formatWebMessage(content.strings.indexTitleWithRank, {
            rankName,
          }),
        }}
      />
      <ScrollView ref={scrollRef} contentContainerStyle={styles.content}>
        <GuidePageView
          rank={rank}
          pageNumber={pageIndex + 1}
          page={page}
          content={content}
        />
        {isLast && (prev || next) && (
          <ListSection style={styles.neighbours}>
            {[prev, next].map((slug, i) =>
              slug ? (
                <ListRow
                  key={slug}
                  leading={
                    <ListIcon
                      ionicon={i === 0 ? "arrow-back" : "arrow-forward"}
                    />
                  }
                  title={formatWebMessage(
                    i === 0
                      ? content.strings.prevRank
                      : content.strings.nextRank,
                    { rankName: t(`ranks.names.${slug}`) },
                  )}
                  onPress={() => router.push(`/dojo/guides/${slug}` as Href)}
                />
              ) : null,
            )}
          </ListSection>
        )}
      </ScrollView>
      {pages.length > 1 && (
        <BottomBar style={styles.pager}>
          <Button
            title={t("common.previous")}
            variant="outline"
            disabled={pageIndex === 0}
            onPress={() => turn(-1)}
            style={styles.pagerButton}
          />
          <Text
            style={[styles.pageCount, { color: colors.mutedForeground }]}
            accessibilityLabel={`${pageIndex + 1} / ${pages.length}`}
          >
            {pageIndex + 1} / {pages.length}
          </Text>
          <Button
            title={t("common.next")}
            disabled={isLast}
            onPress={() => turn(1)}
            style={styles.pagerButton}
          />
        </BottomBar>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  neighbours: {
    marginTop: spacing.lg,
  },
  pager: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  pagerButton: {
    flex: 1,
  },
  pageCount: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    fontVariant: ["tabular-nums"],
  },
});
