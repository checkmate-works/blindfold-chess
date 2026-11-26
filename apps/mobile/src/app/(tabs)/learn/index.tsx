import { useRouter } from "expo-router";
import type { Href } from "expo-router";
import { useTranslation } from "react-i18next";

import {
  ListIcon,
  ListRow,
  ListSection,
  TabScrollView,
} from "../../../components";
import { LEARN_ARTICLES } from "../../../features/learn/generated/articles";
import {
  LEARN_CATEGORIES,
  LEARN_CATEGORY_ICONS,
  localized,
} from "../../../features/learn/types";

/**
 * The learn tab: the web's learn articles, grouped by category in the
 * web's order. The articles ship with the app (see
 * `scripts/bundle-learn-content.ts`), so the tab works offline.
 */
export default function LearnTab() {
  const { t, i18n } = useTranslation();
  const router = useRouter();

  return (
    <TabScrollView>
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
