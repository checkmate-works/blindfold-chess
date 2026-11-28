import type { Href } from "expo-router";
import { useTranslation } from "react-i18next";
import { ChessPieceIcon } from "@blindfold-chess/icons";
import type { PieceType } from "@blindfold-chess/types";

import { ListIcon, ListRow, ListSection } from "../../components";
import { useOpenRootScreen } from "../../navigation/use-open-root-screen";
import { LEARN_ARTICLES } from "./generated/articles";
import { LEARN_CATEGORY_ICONS, localized } from "./types";

const PIECE_SIZE = 22;

type ArticleSectionProps = {
  /** The learn articles the practice builds on (`LEARN_ARTICLES` slugs), in order. */
  slugs: readonly string[];
  /**
   * The piece to draw for an article, by slug, where the web's card draws
   * one of its own (legal moves' four movement articles, knight tour's
   * knight); others take their category's icon.
   */
  pieces?: Readonly<Record<string, PieceType>>;
};

/**
 * The web practice page's article cards, as grouped rows under `title` that
 * open each article in the app's learn screen. The rows read the articles'
 * own titles and excerpts, the way the learn tab lists them, so a practice
 * needs no strings of its own for them. An article the app does not ship
 * is left out, and with none left the section is not drawn.
 *
 * A free-play result shows the same rows inside the session modal, so a row
 * opens its article through `useOpenRootScreen`: from a result it closes
 * the session first, and the article opens over the setup.
 */
function ArticleSection({
  title,
  slugs,
  pieces,
}: ArticleSectionProps & { title: string }) {
  const { i18n } = useTranslation();
  const openRootScreen = useOpenRootScreen();
  const articles = slugs.flatMap((slug) => {
    const article = LEARN_ARTICLES.find((a) => a.slug === slug);
    return article ? [article] : [];
  });
  if (articles.length === 0) return null;

  return (
    <ListSection title={title}>
      {articles.map((article) => (
        <ListRow
          key={article.slug}
          leading={
            <ListIcon ionicon={LEARN_CATEGORY_ICONS[article.category]}>
              {pieces?.[article.slug] && (
                <ChessPieceIcon
                  type={pieces[article.slug]}
                  color="w"
                  size={PIECE_SIZE}
                />
              )}
            </ListIcon>
          }
          title={localized(article.title, i18n.language)}
          subtitle={localized(article.excerpt, i18n.language)}
          onPress={() => openRootScreen(`/learn/${article.slug}` as Href)}
          testID={`required-knowledge-${article.slug}`}
        />
      ))}
    </ListSection>
  );
}

/**
 * The articles under the web's "Required Knowledge" heading: what the
 * module assumes the player already knows. Use whichever heading the web's
 * page for the module uses.
 */
export function RequiredKnowledgeSection(props: ArticleSectionProps) {
  const { t } = useTranslation();
  return <ArticleSection title={t("practice.requiredKnowledge")} {...props} />;
}

/**
 * The same rows under the web's "Related Articles" heading: further reading
 * rather than a prerequisite. A free-play result's "Related Learning" on
 * the web is this heading too (the app has one string for both).
 *
 * The two headings are two components rather than a free-text title, so a
 * screen picks one of the web's two names and cannot drift to a third.
 */
export function RelatedArticlesSection(props: ArticleSectionProps) {
  const { t } = useTranslation();
  return <ArticleSection title={t("practice.relatedArticles")} {...props} />;
}
