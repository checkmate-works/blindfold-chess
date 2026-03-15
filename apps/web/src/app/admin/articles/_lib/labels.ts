type TranslationFn = (key: string) => string;

export function getArticleFormLabels(t: TranslationFn, formTitle: string) {
  return {
    formTitle,
    slug: t('form.slug'),
    slugPlaceholder: t('form.slugPlaceholder'),
    title: t('form.title'),
    titlePlaceholder: t('form.titlePlaceholder'),
    content: t('form.content'),
    contentPlaceholder: t('form.contentPlaceholder'),
    locale: t('form.locale'),
    saveDraft: t('form.saveDraft'),
    savingDraft: t('form.savingDraft'),
    draftSaved: t('form.draftSaved'),
    preview: t('form.preview'),
    cancel: t('form.cancel'),
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
