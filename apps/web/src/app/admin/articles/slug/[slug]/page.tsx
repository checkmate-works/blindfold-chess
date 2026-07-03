import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { formatDateTime } from '@/app/admin/_lib/format';
import { SUPPORTED_LOCALES } from '@/config';
import { eq } from 'drizzle-orm';
import { FaExternalLinkAlt } from 'react-icons/fa';

import { type Article, articles, db } from '@/lib/db';

import { AdminDataTable } from '../../../_components/AdminDataTable';
import { AdminPageHeader } from '../../../_components/AdminPageHeader';
import { DeleteArticleButton } from '../../_components/DeleteArticleButton';

async function getArticlesBySlug(slug: string): Promise<Article[]> {
  return db.select().from(articles).where(eq(articles.slug, slug)).orderBy(articles.locale);
}

export default async function AdminArticleSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const t = await getTranslations({ locale: 'en', namespace: 'Admin.articlesTable' });
  const articleList = await getArticlesBySlug(slug);

  if (articleList.length === 0) {
    notFound();
  }

  const existingLocales = new Set(articleList.map((a) => a.locale));
  const missingLocales = SUPPORTED_LOCALES.filter((locale) => !existingLocales.has(locale));
  // Use the content format of existing variants so new variants match
  const existingContentFormat = articleList[0]?.contentFormat ?? 'tiptap_json';

  return (
    <div>
      <AdminPageHeader
        breadcrumbs={[
          { label: t('title'), href: '/admin/articles' },
          { label: t('slugDetail.title') },
        ]}
      />

      <div className="mb-6">
        <p className="text-muted-foreground">
          {t('slug')}: <code className="bg-accent px-2 py-0.5 rounded text-sm">{slug}</code>
        </p>
      </div>

      <AdminDataTable
        headers={[t('locale'), t('titleColumn'), t('status'), t('publishedAt'), t('actions')]}
        items={articleList}
        emptyMessage={t('slugDetail.noArticlesFound')}
        renderRow={(article) => (
          <tr key={article.id} className="border-t border-border">
            <td className="px-4 py-3">
              <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-accent">
                {article.locale}
              </span>
            </td>
            <td className="px-4 py-3 font-medium">{article.title}</td>
            <td className="px-4 py-3">
              <span
                className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                  article.status === 'published'
                    ? 'bg-success-soft text-success-soft-foreground'
                    : 'bg-warning-soft text-warning-soft-foreground'
                }`}
              >
                {article.status === 'published' ? t('published') : t('draft')}
              </span>
            </td>
            <td className="px-4 py-3 text-muted-foreground">
              {formatDateTime(article.publishedAt)}
            </td>
            <td className="px-4 py-3">
              <div className="flex items-center gap-2">
                {article.status === 'published' && article.publishedAt != null && (
                  <a
                    href={`/${article.locale}/articles/${article.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1 text-xs font-medium rounded bg-card text-foreground hover:bg-secondary border border-border transition-colors inline-flex items-center gap-1"
                  >
                    {t('slugDetail.viewPublished')}
                    <FaExternalLinkAlt className="w-2.5 h-2.5" />
                  </a>
                )}
                <Link
                  href={`/admin/articles/${article.id}/edit`}
                  className="px-3 py-1 text-xs font-medium rounded bg-card text-foreground hover:bg-secondary border border-border transition-colors"
                >
                  {t('edit')}
                </Link>
                <DeleteArticleButton
                  id={article.id}
                  title={article.title}
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
        )}
      />

      {missingLocales.length > 0 && (
        <div className="mt-6 p-4 rounded-lg border border-border bg-card">
          <h2 className="text-sm font-medium mb-3">{t('slugDetail.missingLocales')}</h2>
          <div className="flex flex-wrap gap-2">
            {missingLocales.map((locale) => (
              <Link
                key={locale}
                href={`/admin/articles/new?slug=${encodeURIComponent(slug)}&locale=${locale}&contentFormat=${existingContentFormat}`}
                className="px-3 py-1.5 text-xs font-medium rounded bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
              >
                {t('slugDetail.createForLocale', { locale })}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
