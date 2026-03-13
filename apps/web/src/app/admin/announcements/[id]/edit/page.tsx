import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { eq } from 'drizzle-orm';

import { announcements, db } from '@/lib/db';

import { EditAnnouncementForm } from '../../_components/EditAnnouncementForm';

function formatDateTimeLocal(date: Date | null): string | null {
  if (!date) return null;
  const d = new Date(date);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

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
