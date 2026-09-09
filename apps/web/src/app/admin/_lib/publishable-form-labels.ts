import type { InterpolatingTranslator } from '@/i18n/translator';

/**
 * The labels every draft-then-publish admin form shares, resolved from that
 * form's own `form.*` namespace: the slug / title / content fields, the locale
 * picker, the save-draft and save-published buttons with their in-flight and
 * done copy, the publish confirmation, and the unsaved-changes dialog.
 *
 * `getAnnouncementFormLabels` and `getArticleFormLabels` spread this and add
 * what is specific to their form; the announcement form adds nothing, the
 * article form its excerpt / description / category / icon / metadata fields
 * and the edit-preview tabs. The two used to list all of these keys again
 * side by side, with a comment on one saying it mirrored the other.
 */
export function getPublishableFormLabels(t: InterpolatingTranslator, formTitle: string) {
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
