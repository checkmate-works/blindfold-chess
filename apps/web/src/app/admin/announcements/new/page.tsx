import { getTranslations } from 'next-intl/server';

import { AdminBreadcrumb } from '@/app/admin/_components/AdminBreadcrumb';

import { NewAnnouncementForm } from '../_components/NewAnnouncementForm';

export default async function NewAnnouncementPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const t = await getTranslations({ locale: 'en', namespace: 'Admin.announcementsTable' });
  const params = await searchParams;

  const slug = typeof params.slug === 'string' ? params.slug : undefined;
  const locale = typeof params.locale === 'string' ? params.locale : undefined;

  return (
    <>
      <AdminBreadcrumb
        items={[
          { label: t('title'), href: '/admin/announcements' },
          { label: t('form.createTitle') },
        ]}
        className="mb-3"
      />
      <NewAnnouncementForm
        defaultSlug={slug}
        defaultLocale={locale}
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
    </>
  );
}
