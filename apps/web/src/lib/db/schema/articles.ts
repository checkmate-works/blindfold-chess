/**
 * Article-related tables.
 *
 * Article categories, articles, images, tags, and practice module associations.
 */
export {
  articleCategories,
  articleCategoryTranslations,
  articles,
  articleImages,
  tags,
  articleTags,
  articlePracticeModules,
} from './tables';

export type {
  ArticleCategory,
  NewArticleCategory,
  ArticleCategoryTranslation,
  NewArticleCategoryTranslation,
  Article,
  NewArticle,
  ArticleImage,
  NewArticleImage,
  Tag,
  NewTag,
  ArticleTag,
  NewArticleTag,
  ArticlePracticeModule,
  NewArticlePracticeModule,
} from './tables';
