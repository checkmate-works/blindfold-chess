import { getTranslations } from 'next-intl/server';

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
        preview: t('form.preview'),
        cancel: t('form.cancel'),
        backToList: t('form.backToList'),
      }}
    />
  );
}
