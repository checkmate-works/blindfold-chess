import { getTranslations } from 'next-intl/server';

import { NewAnnouncementForm } from '../_components/NewAnnouncementForm';

export default async function NewAnnouncementPage() {
  const t = await getTranslations({ locale: 'en', namespace: 'Admin.announcementsTable' });

  return (
    <NewAnnouncementForm
      labels={{
        formTitle: t('form.createTitle'),
        slug: t('form.slug'),
        slugPlaceholder: t('form.slugPlaceholder'),
        title: t('form.title'),
        titlePlaceholder: t('form.titlePlaceholder'),
        content: t('form.content'),
        contentPlaceholder: t('form.contentPlaceholder'),
        locale: t('form.locale'),
        saveDraft: t('form.saveDraft'),
        savingDraft: t('form.savingDraft'),
        preview: t('form.preview'),
        cancel: t('form.cancel'),
        backToList: t('form.backToList'),
      }}
    />
  );
}
