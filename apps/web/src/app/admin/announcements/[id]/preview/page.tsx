import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { eq } from 'drizzle-orm';

import { announcements, db } from '@/lib/db';

import { MarkdownRenderer } from '@/app/[locale]/_components';

import { AnnouncementPreviewForm } from '../../_components/AnnouncementPreviewForm';
import { formatDateTimeLocal } from '../../_lib/format';

export default async function PreviewAnnouncementPage({
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
    <div>
      <div className="flex items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold">{t('form.previewTitle')}</h1>
      </div>

      <div className="max-w-2xl space-y-6">
        <div>
          <h2 className="text-sm font-medium text-muted-foreground mb-2">
            {t('form.contentPreview')}
          </h2>
          <div className="border border-border rounded-lg p-6 bg-card shadow-sm">
            <h2 className="text-xl font-bold mb-4">{announcement.title}</h2>
            <article className="prose prose-slate dark:prose-invert max-w-none break-words">
              <MarkdownRenderer content={announcement.content} skipFirstH1={true} />
            </article>
          </div>
        </div>

        <div>
          <p className="text-sm text-muted-foreground">
            {t('form.locale')}: <span className="text-foreground">{announcement.locale}</span>
          </p>
        </div>

        <AnnouncementPreviewForm
          id={announcement.id}
          announcementData={{
            slug: announcement.slug,
            title: announcement.title,
            content: announcement.content,
            locale: announcement.locale,
          }}
          defaultValues={{
            status: announcement.status ?? 'draft',
            visibility: announcement.visibility ?? 'public',
            pinnedAt: formatDateTimeLocal(announcement.pinnedAt) ?? '',
            publishedAt: formatDateTimeLocal(announcement.publishedAt) ?? '',
          }}
          labels={{
            status: t('form.status'),
            visibility: t('form.visibility'),
            pinnedAt: t('form.pinnedAt'),
            publishedAt: t('form.publishedAt'),
            save: t('form.save'),
            saving: t('form.saving'),
            backToEdit: t('form.backToEdit'),
            draft: t('draft'),
            published: t('published'),
            public: t('public'),
            members: t('members'),
          }}
        />
      </div>
    </div>
  );
}
