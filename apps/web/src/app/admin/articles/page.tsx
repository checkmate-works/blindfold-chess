import Link from 'next/link';

import { type Article, articles } from '@/lib/db';

import { createAdminListPage } from '../_components/AdminListPage';
import { DeleteArticleButton } from './_components/DeleteArticleButton';

export default createAdminListPage<Article>({
  table: articles,
  translationNamespace: 'Admin.articlesTable',
  basePath: '/admin/articles',
  newButtonTranslationKey: 'newArticle',
  emptyMessageKey: 'noArticlesFound',
  headers: (t) => [
    t('titleColumn'),
    t('locale'),
    t('status'),
    t('pinned'),
    t('publishedAt'),
    t('actions'),
  ],
  renderRow: (item, t) => (
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
              ? 'bg-success-soft text-success-soft-foreground'
              : 'bg-warning-soft text-warning-soft-foreground'
          }`}
        >
          {item.status === 'published' ? t('published') : t('draft')}
        </span>
      </td>
      <td className="px-4 py-3 text-muted-foreground">{item.pinnedAt ? t('yes') : t('no')}</td>
      <td className="px-4 py-3 text-muted-foreground">
        {item.publishedAt ? new Date(item.publishedAt).toLocaleString() : '-'}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <Link
            href={`/admin/articles/${item.id}/edit`}
            className="px-3 py-1 text-xs font-medium rounded bg-card text-foreground hover:bg-secondary border border-border transition-colors"
          >
            {t('edit')}
          </Link>
          <DeleteArticleButton
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
  ),
});
