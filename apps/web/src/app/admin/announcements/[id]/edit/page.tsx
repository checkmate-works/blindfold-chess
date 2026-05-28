import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { eq } from 'drizzle-orm';

import { announcements, db } from '@/lib/db';

import { formatDateTimeLocal } from '../../../_lib/format';
import { EditAnnouncementForm } from '../../_components/EditAnnouncementForm';

export default async function EditAnnouncementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations({ locale: 'en', namespace: 'Admin.announcementsTable' });

  const [announcement] = await db
    .select()
    .from(announcements)
    .where(eq(announcements.id, id))
    .limit(1);

  if (!announcement) {
    notFound();
  }

  return (
    <EditAnnouncementForm
      id={announcement.id}
      defaultValues={{
        slug: announcement.slug,
        title: announcement.title,
        content: announcement.content,
        locale: announcement.locale,
        status: announcement.status ?? 'draft',
        visibility: announcement.visibility ?? 'public',
        showAsBanner: announcement.showAsBanner,
        pinnedAt: formatDateTimeLocal(announcement.pinnedAt),
        publishedAt: formatDateTimeLocal(announcement.publishedAt),
      }}
      labels={{
        formTitle: t('form.editTitle'),
        slug: t('form.slug'),
        slugPlaceholder: t('form.slugPlaceholder'),
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
      }}
    />
  );
}
