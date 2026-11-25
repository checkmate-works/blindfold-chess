import { useRouter } from "expo-router";
import type { Href } from "expo-router";
import { useTranslation } from "react-i18next";
import { ChessPieceIcon } from "@blindfold-chess/icons";
import type { PieceType } from "@blindfold-chess/types";

import { ListIcon, ListRow, ListSection } from "../../components";
import { LEARN_ARTICLES } from "./generated/articles";
import { LEARN_CATEGORY_ICONS, localized } from "./types";

const PIECE_SIZE = 22;

type RequiredKnowledgeSectionProps = {
  /** The learn articles the practice builds on (`LEARN_ARTICLES` slugs), in order. */
  slugs: readonly string[];
  /**
   * The section's caption: the web's own heading for the module's articles.
   * Defaults to "Required Knowledge".
   */
  title?: string;
  /**
   * The piece to draw for an article, by slug, where the web's card draws
   * one of its own (legal moves' four movement articles); others take
   * their category's icon.
   */
  pieces?: Readonly<Record<string, PieceType>>;
};

/**
 * The web practice page's article cards ("Required Knowledge", or legal
 * moves' "Related Articles"), as grouped rows that open each article in the
 * app's learn screen. The rows read the articles' own titles and excerpts,
 * the way the learn tab lists them, so a practice needs no strings of its
 * own for them. An article the app does not ship is left out, and with none
 * left the section is not drawn.
 */
export function RequiredKnowledgeSection({
  slugs,
  title,
  pieces,
}: RequiredKnowledgeSectionProps) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const articles = slugs.flatMap((slug) => {
    const article = LEARN_ARTICLES.find((a) => a.slug === slug);
    return article ? [article] : [];
  });
  if (articles.length === 0) return null;

  return (
    <ListSection title={title ?? t("practice.requiredKnowledge")}>
      {articles.map((article) => (
        <ListRow
          key={article.slug}
          leading={
            <ListIcon glyph={LEARN_CATEGORY_ICONS[article.category]}>
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
          onPress={() => router.push(`/learn/${article.slug}` as Href)}
          testID={`required-knowledge-${article.slug}`}
        />
      ))}
    </ListSection>
  );
}
