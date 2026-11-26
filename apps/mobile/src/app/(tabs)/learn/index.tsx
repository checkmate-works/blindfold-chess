import { useRouter } from "expo-router";
import type { Href } from "expo-router";
import { useTranslation } from "react-i18next";

import {
  ListIcon,
  ListRow,
  ListSection,
  TabScrollView,
} from "../../../components";
import {
  allJourneys,
  useDojoJourney,
} from "../../../features/dojo/use-dojo-journey";
import {
  GUIDE_RANKS,
  formatWebMessage,
  guideContent,
} from "../../../features/guides/content";
import {
  guidePageHref,
  guideReadingProgress,
} from "../../../features/guides/reading-progress";
import { LEARN_ARTICLES } from "../../../features/learn/generated/articles";
import {
  LEARN_CATEGORIES,
  LEARN_CATEGORY_ICONS,
  localized,
} from "../../../features/learn/types";

/**
 * The learn tab: the dojo's guides, then the glossary, then the web's learn
 * articles grouped by category in the web's order. Guides and articles ship
 * with the app (see `scripts/bundle-guides.ts` and
 * `scripts/bundle-learn-content.ts`), so the tab works offline.
 *
 * @description
 * The guides come first, one row per guide in ladder order, because they
 * are the dojo's reading — the learn stage of every rank — and this list is
 * where a rank's "Learn" cell sends the player. A row shows how far the
 * guide is read, counted by `guideReadingProgress`, the same count the
 * guide screen keeps: a check once every page is read, "n / N" part way,
 * nothing before the first page, matching the practice list's rows. It is
 * read out in words ("Read", "2 of 5 pages read") rather than as the bare
 * glyph or numbers. Pressing a row opens the guide at its first unread
 * page, or at the first page once it is read through.
 */
export default function LearnTab() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { journeyOf } = useDojoJourney();
  const guides = guideContent(i18n.language);
  const journeys = allJourneys(journeyOf);

  return (
    <TabScrollView>
      <ListSection title={guides.strings.title}>
        {GUIDE_RANKS.map((rank) => {
          const guide = guides.guides[rank];
          if (!guide) return null;
          const progress = guideReadingProgress(
            journeys,
            rank,
            guide.pages.length,
          );
          const title = formatWebMessage(guides.strings.indexTitleWithRank, {
            // ranks.names.mukyu, ranks.names.5kyu, ranks.names.4kyu, …
            rankName: t(`ranks.names.${rank}`),
          });
          const finished = progress.read >= progress.total;
          const value = finished
            ? "✓"
            : progress.read > 0
              ? t("dojo.rankProgress", {
                  done: progress.read,
                  total: progress.total,
                })
              : undefined;
          const spoken = finished
            ? t("dojo.guideRead")
            : progress.read > 0
              ? t("learn.guidePagesRead", {
                  done: progress.read,
                  total: progress.total,
                })
              : undefined;
          return (
            <ListRow
              key={rank}
              testID={`guide-${rank}`}
              leading={<ListIcon ionicon="book-outline" />}
              title={title}
              value={value}
              accessibilityLabel={
                spoken === undefined ? undefined : `${title}, ${spoken}`
              }
              onPress={() =>
                router.push(guidePageHref(rank, progress.firstUnreadPage ?? 1))
              }
            />
          );
        })}
      </ListSection>
      <ListSection>
        <ListRow
          leading={<ListIcon ionicon="library-outline" />}
          title={t("glossary.title")}
          subtitle={t("glossary.subtitle")}
          onPress={() => router.push("/learn/glossary")}
        />
      </ListSection>
      {/* learn.categories.{moves,coordinates,notation,memory,practice} */}
      {LEARN_CATEGORIES.map((category) => {
        const articles = LEARN_ARTICLES.filter((a) => a.category === category);
        if (articles.length === 0) return null;
        return (
          <ListSection key={category} title={t(`learn.categories.${category}`)}>
            {articles.map((article) => (
              <ListRow
                key={article.slug}
                testID={`learn-${article.slug}`}
                leading={<ListIcon ionicon={LEARN_CATEGORY_ICONS[category]} />}
                title={localized(article.title, i18n.language)}
                subtitle={localized(article.excerpt, i18n.language)}
                onPress={() => router.push(`/learn/${article.slug}` as Href)}
              />
            ))}
          </ListSection>
        );
      })}
    </TabScrollView>
  );
}
