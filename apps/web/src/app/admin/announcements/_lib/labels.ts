import type { InterpolatingTranslator } from '@/i18n/translator';

/**
 * Build a labels object for `AnnouncementForm` from the i18n translation
 * function.
 *
 * Centralizes label resolution so that `NewAnnouncementPage` and
 * `EditAnnouncementPage` only need to pass the appropriate `formTitle`
 * (create vs. edit). Mirrors `getArticleFormLabels`.
 */
export function getAnnouncementFormLabels(t: InterpolatingTranslator, formTitle: string) {
  return {
    formTitle,
    slug: t('form.slug'),
    slugPlaceholder: t('form.slugPlaceholder'),
    generateSlugFromTitle: t('form.generateSlugFromTitle'),
    title: t('form.title'),
    titlePlaceholder: t('form.titlePlaceholder'),
    content: t('form.content'),
    contentPlaceholder: t('form.contentPlaceholder'),
    locale: t('form.locale'),
    saveDraft: t('form.saveDraft'),
    savingDraft: t('form.savingDraft'),
    savePublished: t('form.savePublished'),
    savingPublished: t('form.savingPublished'),
    preview: t('form.preview'),
    cancel: t('form.cancel'),
    unsavedChangesTitle: t('form.unsavedChangesTitle'),
    unsavedChangesMessage: t('form.unsavedChangesMessage'),
    unsavedChangesConfirm: t('form.unsavedChangesConfirm'),
    unsavedChangesCancel: t('form.unsavedChangesCancel'),
    draftSaved: t('form.draftSaved'),
    publishedSaved: t('form.publishedSaved'),
    publishedConfirmTitle: t('form.publishedConfirmTitle'),
    publishedConfirmMessage: t('form.publishedConfirmMessage'),
    publishedConfirmConfirm: t('form.publishedConfirmConfirm'),
    publishedConfirmCancel: t('form.publishedConfirmCancel'),
  };
}
