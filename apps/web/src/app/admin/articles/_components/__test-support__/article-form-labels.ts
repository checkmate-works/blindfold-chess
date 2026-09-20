/**
 * The label bundle ArticleForm and EditArticleForm are rendered with in
 * tests — English strings standing in for the translated ones.
 *
 * Both forms take the same 39 labels and differ only in the heading, which
 * mirrors production: `getArticleFormLabels(t, formTitle)` in `_lib/labels.ts`
 * builds the real bundle the same way. Keeping one fixture means a label
 * added to the form's prop type is added to the tests once, not twice, and
 * the two suites cannot drift into asserting on different wording for the
 * same control.
 */
export function articleFormLabels(formTitle: string) {
  return {
    formTitle,
    slug: 'Slug',
    slugPlaceholder: 'e.g. new-feature-release',
    generateSlugFromTitle: 'Generate from title',
    title: 'Title',
    titlePlaceholder: 'Article title',
    content: 'Content',
    contentPlaceholder: 'Article content...',
    locale: 'Locale',
    saveDraft: 'Save Draft',
    savingDraft: 'Saving...',
    draftSaved: 'Draft saved',
    preview: 'Publish Settings',
    cancel: 'Cancel',
    excerpt: 'Excerpt',
    excerptPlaceholder: 'Brief summary of the article...',
    description: 'Description (SEO)',
    descriptionPlaceholder: 'Meta description for search engines...',
    category: 'Category',
    categoryNone: 'None',
    icon: 'Icon',
    iconPlaceholder: 'e.g. ♟️',
    metadata: 'Metadata',
    tabEdit: 'Edit',
    tabPreview: 'Preview',
    unsavedChangesTitle: 'Unsaved Changes',
    unsavedChangesMessage: 'You have unsaved changes. Are you sure you want to leave?',
    unsavedChangesConfirm: 'Leave',
    unsavedChangesCancel: 'Stay',
    savePublished: 'Save',
    savingPublished: 'Saving...',
    publishedSaved: 'Article saved',
    publishedConfirmTitle: 'Confirm Save',
    publishedConfirmMessage:
      'This article is published. Your changes will be reflected immediately. Are you sure?',
    publishedConfirmConfirm: 'Save',
    publishedConfirmCancel: 'Cancel',
  };
}
