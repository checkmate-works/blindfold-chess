import { getTranslations } from 'next-intl/server';

import { AdminBreadcrumb } from '@/app/admin/_components/AdminBreadcrumb';

import { NewAnnouncementForm } from '../_components/NewAnnouncementForm';
import { getAnnouncementFormLabels } from '../_lib/labels';

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
        labels={getAnnouncementFormLabels(t, t('form.createTitle'))}
      />
    </>
  );
}
