import type { InterpolatingTranslator } from '@/i18n/translator';

import { getPublishableFormLabels } from '../../_lib/publishable-form-labels';

/**
 * Build a labels object for `ArticleForm` from the i18n translation function.
 *
 * Centralizes label resolution so that `NewArticlePage` and `EditArticlePage`
 * only need to pass the appropriate `formTitle` (create vs. edit). On top of
 * the shared draft-then-publish set, an article has an excerpt, a description,
 * a category, an icon and free-form metadata, and its editor is tabbed.
 */
export function getArticleFormLabels(t: InterpolatingTranslator, formTitle: string) {
  return {
    ...getPublishableFormLabels(t, formTitle),
    excerpt: t('form.excerpt'),
    excerptPlaceholder: t('form.excerptPlaceholder'),
    description: t('form.description'),
    descriptionPlaceholder: t('form.descriptionPlaceholder'),
    category: t('form.category'),
    categoryNone: t('form.categoryNone'),
    icon: t('form.icon'),
    iconPlaceholder: t('form.iconPlaceholder'),
    metadata: t('form.metadata'),
    tabEdit: t('form.tabEdit'),
    tabPreview: t('form.tabPreview'),
  };
}
