import { useRef, useState } from "react";
import { ScrollView, StyleSheet, Text } from "react-native";
import type { ScrollViewInstance } from "react-native";
import {
  Stack,
  router,
  useLocalSearchParams,
  useNavigation,
  type Href,
} from "expo-router";
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
import { afterGuide } from "../../../features/guides/after-guide";
import { GuidePageView } from "../../../features/guides/GuidePageView";
import {
  adjacentGuideRanks,
  formatWebMessage,
  guideContent,
} from "../../../features/guides/content";
import {
  guideStartPage,
  readGuidePages,
} from "../../../features/guides/reading-progress";
import {
  allJourneys,
  useDojoJourney,
} from "../../../features/dojo/use-dojo-journey";
import { routeBelow } from "../../../navigation/route-below";
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
 * Each page is one step of the dojo's "learn" stage. Counting the guide as
 * a whole instead would leave the stage at 0 / 1 until the very end, which
 * says nothing about how far the player has read. A page is marked read
 * when the player moves past it with Next. Only the app records pages: the
 * web shows no reading progress, so a record there would have nothing to
 * show it.
 *
 * The last page, which has no Next, has a button in its place (also the
 * only button of a one-page guide) that marks the page read and goes on to
 * the next step of the learn stage the guide belongs to (`afterGuide`):
 * another of the stage's guides still unread, or, once the stage is read
 * through, the practice list narrowed to the rank. Reading is one step of
 * the rank's journey, not an end in itself, so finishing a guide leads
 * straight into what the journey asks for next instead of leaving the
 * player on a page with nothing left to do. Its label names where it goes
 * ("Done, next guide" / "Done, on to practice"). A guide read before keeps
 * the button, as "Next guide" / "On to practice" to the same place, rather
 * than a disabled "Read": a player rereading a guide is on the same road
 * and should be able to carry on along it.
 *
 * The next guide replaces this screen (`router.replace`), so a stage of two
 * guides does not leave one guide under the other. The practice list is a
 * tab, and the guide sits on the root stack above the tabs: a plain
 * `router.navigate` there would push a second set of tabs onto the root
 * stack, over the guide, because the root stack's `NAVIGATE` only reuses a
 * route that is already on top. `router.dismissTo` pops the root stack back
 * to the tabs instead, closing the guide (and whatever detail screen opened
 * it) and switching to the practice tab with its `rank` param.
 *
 * An optional `page` param (1-based) opens the guide at that page: the
 * learn tab's guide list opens each guide at its first unread page, so a
 * player coming back to a half-read guide does not page through what they
 * have read. A value that is not one of the guide's pages opens the first
 * page. The param only sets where the screen starts; Previous / Next work
 * as usual from there.
 *
 * @flow
 * 1. Opened from the rank screen's guide row, the learn tab's guide list
 *    (at the first unread page), or from another guide's link.
 * 2. Previous / Next step through the pages, Next marking the page read;
 *    the last page offers the neighbouring ranks' guides, as the web's last
 *    page does.
 * 3. The last page's button marks it read and replaces the screen with the
 *    stage's next unread guide, or dismisses it to the rank's practice list.
 */
export default function GuideScreen() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { rank, page: pageParam } = useLocalSearchParams<{
    rank: string;
    page?: string;
  }>();
  const content = guideContent(i18n.language);
  const guide = isRankSlug(rank) ? content.guides[rank] : undefined;
  const [pageIndex, setPageIndex] = useState(
    () => guideStartPage(pageParam, guide?.pages.length ?? 0) - 1,
  );
  const scrollRef = useRef<ScrollViewInstance>(null);
  const { journeyOf, markGuidePage } = useDojoJourney();
  if (!isRankSlug(rank) || !guide) return null;

  const pages = guide.pages;
  const page = pages[pageIndex] ?? pages[0];
  const isLast = pageIndex === pages.length - 1;
  const rankName = t(`ranks.names.${rank}`);
  const { prev, next } = adjacentGuideRanks(rank);
  const lastPageRead = readGuidePages(allJourneys(journeyOf), rank).has(
    pages.length,
  );
  const after = afterGuide(rank, journeyOf);

  const turn = (delta: number) => {
    if (delta > 0) markGuidePage(rank, pageIndex + 1);
    setPageIndex((i) => Math.min(Math.max(i + delta, 0), pages.length - 1));
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  };

  // The previous / next rank rows. Arrived here from that rank's guide (by
  // the row pointing the other way), go back to it rather than push a copy,
  // or rows tapped back and forth would stack A → B → A → B for the back
  // button to walk through.
  const openNeighbour = (slug: string) => {
    const below = routeBelow(navigation.getState());
    const belowRank =
      below?.params && "rank" in below.params ? below.params.rank : undefined;
    if (below?.name === "dojo/guides/[rank]" && belowRank === slug) {
      router.back();
    } else {
      router.push(`/dojo/guides/${slug}` as Href);
    }
  };

  const finish = () => {
    if (!lastPageRead) markGuidePage(rank, pages.length);
    if (after.kind === "guide") router.replace(after.href);
    else router.dismissTo(after.href);
  };

  const doneButton = (
    <Button
      title={t(
        after.kind === "guide"
          ? lastPageRead
            ? "dojo.guideNextGuide"
            : "dojo.guideDoneNextGuide"
          : lastPageRead
            ? "dojo.guideToPractice"
            : "dojo.guideDonePractice",
      )}
      onPress={finish}
      style={styles.pagerButton}
      testID="guide-done"
    />
  );

  return (
    <Screen edges={[]}>
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
                  onPress={() => openNeighbour(slug)}
                />
              ) : null,
            )}
          </ListSection>
        )}
      </ScrollView>
      <BottomBar style={styles.pager}>
        {pages.length > 1 && (
          <>
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
          </>
        )}
        {isLast ? (
          doneButton
        ) : (
          <Button
            title={t("common.next")}
            onPress={() => turn(1)}
            style={styles.pagerButton}
          />
        )}
      </BottomBar>
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
