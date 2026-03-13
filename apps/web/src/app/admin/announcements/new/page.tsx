import { getTranslations } from 'next-intl/server';

import { createAnnouncement } from '../_actions/createAnnouncement';
import { AnnouncementForm } from '../_components/AnnouncementForm';

export default async function NewAnnouncementPage() {
  const t = await getTranslations({ locale: 'en', namespace: 'Admin.announcementsTable' });

  return (
    <AnnouncementForm
      onSubmit={createAnnouncement}
      labels={{
        formTitle: t('form.createTitle'),
        slug: t('form.slug'),
        slugPlaceholder: t('form.slugPlaceholder'),
        title: t('form.title'),
        titlePlaceholder: t('form.titlePlaceholder'),
        content: t('form.content'),
        contentPlaceholder: t('form.contentPlaceholder'),
        locale: t('form.locale'),
        status: t('form.status'),
        visibility: t('form.visibility'),
        pinnedAt: t('form.pinnedAt'),
        publishedAt: t('form.publishedAt'),
        save: t('form.save'),
        saving: t('form.saving'),
        cancel: t('form.cancel'),
        backToList: t('form.backToList'),
        draft: t('draft'),
        published: t('published'),
        public: t('public'),
        members: t('members'),
      }}
    />
  );
}
