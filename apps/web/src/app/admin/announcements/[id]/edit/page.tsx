import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { AdminBreadcrumb } from '@/app/admin/_components/AdminBreadcrumb';
import { eq } from 'drizzle-orm';

import { announcements, db } from '@/lib/db';

import { formatDateTimeLocal } from '../../../_lib/format';
import { EditAnnouncementForm } from '../../_components/EditAnnouncementForm';
import { getAnnouncementFormLabels } from '../../_lib/labels';

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
    <>
      <AdminBreadcrumb
        items={[{ label: t('title'), href: '/admin/announcements' }, { label: announcement.title }]}
        className="mb-3"
      />
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
        labels={getAnnouncementFormLabels(t, t('form.editTitle'))}
      />
    </>
  );
}
