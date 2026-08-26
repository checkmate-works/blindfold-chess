import type { ComponentProps, ComponentType } from 'react';

import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { SUPPORTED_LOCALES } from '@/config';
import { FaExternalLinkAlt } from 'react-icons/fa';

import { formatDateTime } from '../_lib/format';
import { AdminBadge } from './AdminBadge';
import { AdminDataTable } from './AdminDataTable';
import type { AdminDeleteButton } from './AdminDeleteButton';
import { AdminPageLayout } from './AdminPageLayout';

/** Minimal row shape required by the slug detail page (Article / Announcement both satisfy it). */
type AdminSlugDetailRow = {
  id: string;
  slug: string;
  title: string;
  locale: string;
  status: string | null;
  publishedAt: Date | null;
};

/** Entity-specific delete button: AdminDeleteButton with the action baked in. */
type SlugDetailDeleteButtonProps = Omit<ComponentProps<typeof AdminDeleteButton>, 'deleteAction'>;

type AdminSlugDetailPageConfig<T extends AdminSlugDetailRow> = {
  /** Fetch all locale variants of the slug, ordered by locale. */
  fetchBySlug: (slug: string) => Promise<T[]>;
  translationNamespace: string;
  /** Admin base path (e.g. '/admin/articles') — used for breadcrumb, edit and new links. */
  basePath: string;
  /** Public route segment (e.g. 'articles') — used for the view-published link `/{locale}/{segment}/{slug}`. */
  publicPathSegment: string;
  emptyMessageKey: string;
  DeleteButton: ComponentType<SlugDetailDeleteButtonProps>;
  /**
   * Extra query params appended to the create-for-locale link
   * (e.g. articles carry over the existing variants' contentFormat).
   */
  extraCreateParams?: (items: T[]) => Record<string, string>;
};

/**
 * Factory for the per-slug locale-variant detail page shared by
 * articles and announcements (counterpart of AdminSlugGroupListPage).
 */
export function createAdminSlugDetailPage<T extends AdminSlugDetailRow>(
  config: AdminSlugDetailPageConfig<T>
) {
  return async function AdminSlugDetailPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const t = await getTranslations({ locale: 'en', namespace: config.translationNamespace });
    const items = await config.fetchBySlug(slug);

    if (items.length === 0) {
      notFound();
    }

    const existingLocales = new Set(items.map((item) => item.locale));
    const missingLocales = SUPPORTED_LOCALES.filter((locale) => !existingLocales.has(locale));
    const extraCreateQuery = Object.entries(config.extraCreateParams?.(items) ?? {})
      .map(([key, value]) => `&${key}=${value}`)
      .join('');
    const { DeleteButton } = config;

    return (
      <AdminPageLayout
        breadcrumbs={[
          { label: t('title'), href: config.basePath },
          { label: t('slugDetail.title') },
        ]}
      >
        <div className="mb-6">
          <p className="text-muted-foreground">
            {t('slug')}: <code className="bg-accent px-2 py-0.5 rounded text-sm">{slug}</code>
          </p>
        </div>

        <AdminDataTable
          headers={[t('locale'), t('titleColumn'), t('status'), t('publishedAt'), t('actions')]}
          items={items}
          emptyMessage={t(config.emptyMessageKey)}
          renderRow={(item) => (
            <tr key={item.id} className="border-t border-border">
              <td className="px-4 py-3">
                <AdminBadge variant="accent">{item.locale}</AdminBadge>
              </td>
              <td className="px-4 py-3 font-medium">{item.title}</td>
              <td className="px-4 py-3">
                <AdminBadge variant={item.status === 'published' ? 'success' : 'warning'}>
                  {item.status === 'published' ? t('published') : t('draft')}
                </AdminBadge>
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {formatDateTime(item.publishedAt)}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  {item.status === 'published' && item.publishedAt != null && (
                    <a
                      href={`/${item.locale}/${config.publicPathSegment}/${item.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1 text-xs font-medium rounded bg-card text-foreground hover:bg-secondary border border-border transition-colors inline-flex items-center gap-1"
                    >
                      {t('slugDetail.viewPublished')}
                      <FaExternalLinkAlt className="w-2.5 h-2.5" />
                    </a>
                  )}
                  <Link
                    href={`${config.basePath}/${item.id}/edit`}
                    className="px-3 py-1 text-xs font-medium rounded bg-card text-foreground hover:bg-secondary border border-border transition-colors"
                  >
                    {t('edit')}
                  </Link>
                  <DeleteButton
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
          )}
        />

        {missingLocales.length > 0 && (
          <div className="mt-6 p-4 rounded-lg border border-border bg-card">
            <h2 className="text-sm font-medium mb-3">{t('slugDetail.missingLocales')}</h2>
            <div className="flex flex-wrap gap-2">
              {missingLocales.map((locale) => (
                <Link
                  key={locale}
                  href={`${config.basePath}/new?slug=${encodeURIComponent(slug)}&locale=${locale}${extraCreateQuery}`}
                  className="px-3 py-1.5 text-xs font-medium rounded bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                >
                  {t('slugDetail.createForLocale', { locale })}
                </Link>
              ))}
            </div>
          </div>
        )}
      </AdminPageLayout>
    );
  };
}
