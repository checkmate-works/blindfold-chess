import { useRouter } from "expo-router";
import type { Href } from "expo-router";
import { useTranslation } from "react-i18next";

import { ListIcon, ListRow, ListSection } from "../../components";
import { LEARN_ARTICLES } from "./generated/articles";
import { LEARN_CATEGORY_ICONS, localized } from "./types";

type RequiredKnowledgeSectionProps = {
  /** The learn article the practice builds on (`LEARN_ARTICLES` slug). */
  slug: string;
};

/**
 * The web practice page's "Required Knowledge" card, as a grouped row that
 * opens the article in the app's learn screen. The row reads the article's
 * own title and excerpt, the way the learn tab lists it, so a practice needs
 * no strings of its own for it. Renders nothing for an article the app does
 * not ship.
 */
export function RequiredKnowledgeSection({
  slug,
}: RequiredKnowledgeSectionProps) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const article = LEARN_ARTICLES.find((a) => a.slug === slug);
  if (!article) return null;

  return (
    <ListSection title={t("practice.requiredKnowledge")}>
      <ListRow
        leading={<ListIcon glyph={LEARN_CATEGORY_ICONS[article.category]} />}
        title={localized(article.title, i18n.language)}
        subtitle={localized(article.excerpt, i18n.language)}
        onPress={() => router.push(`/learn/${article.slug}` as Href)}
        testID={`required-knowledge-${article.slug}`}
      />
    </ListSection>
  );
}
