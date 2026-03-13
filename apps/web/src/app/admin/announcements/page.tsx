import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

import { desc, sql } from 'drizzle-orm';
import { createSearchParamsCache, parseAsInteger } from 'nuqs/server';

import { announcements, db } from '@/lib/db';

import { PaginationNav } from '@/app/[locale]/_components';

import { DeleteAnnouncementButton } from './_components/DeleteAnnouncementButton';

const PAGE_SIZE = 20;

const searchParamsCache = createSearchParamsCache({
  page: parseAsInteger.withDefault(1),
});

export default async function AdminAnnouncementsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { page } = await searchParamsCache.parse(searchParams);
  const t = await getTranslations({ locale: 'en', namespace: 'Admin.announcementsTable' });

  const currentPage = Math.max(1, page);

  const [countResult] = await db.select({ count: sql<number>`count(*)` }).from(announcements);
  const totalCount = Number(countResult.count);
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const items = await db
    .select()
    .from(announcements)
    .orderBy(desc(announcements.createdAt))
    .limit(PAGE_SIZE)
    .offset((currentPage - 1) * PAGE_SIZE);

  const buildHref = (p: number) => `/admin/announcements?page=${p}`;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <Link
          href="/admin/announcements/new"
          className="px-4 py-2 text-sm rounded bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
        >
          {t('newAnnouncement')}
        </Link>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-secondary">
            <tr>
              <th className="text-left px-4 py-3 font-medium">{t('titleColumn')}</th>
              <th className="text-left px-4 py-3 font-medium">{t('locale')}</th>
              <th className="text-left px-4 py-3 font-medium">{t('status')}</th>
              <th className="text-left px-4 py-3 font-medium">{t('visibility')}</th>
              <th className="text-left px-4 py-3 font-medium">{t('pinned')}</th>
              <th className="text-left px-4 py-3 font-medium">{t('publishedAt')}</th>
              <th className="text-left px-4 py-3 font-medium">{t('actions')}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t border-border">
                <td className="px-4 py-3">
                  <div>
                    <div className="font-medium">{item.title}</div>
                    <div className="text-xs text-muted-foreground">{item.slug}</div>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{item.locale}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                      item.status === 'published'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {item.status === 'published' ? t('published') : t('draft')}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {item.visibility === 'public' ? t('public') : t('members')}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {item.pinnedAt ? t('yes') : t('no')}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {item.publishedAt ? new Date(item.publishedAt).toLocaleString() : '-'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/admin/announcements/${item.id}/edit`}
                      className="px-3 py-1 text-xs font-medium rounded bg-secondary text-foreground hover:bg-background border border-border transition-colors"
                    >
                      {t('edit')}
                    </Link>
                    <DeleteAnnouncementButton
                      id={item.id}
                      title={item.title}
                      labels={{
                        deleteButton: t('delete'),
                        modalTitle: t('deleteModalTitle'),
                        modalMessage: t('deleteModalMessage'),
                        cancel: t('deleteModalCancel'),
                        confirm: t('deleteModalConfirm'),
                        deleting: t('deleteModalDeleting'),
                      }}
                    />
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  {t('noAnnouncementsFound')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <PaginationNav currentPage={currentPage} totalPages={totalPages} buildHref={buildHref} />
    </div>
  );
}
