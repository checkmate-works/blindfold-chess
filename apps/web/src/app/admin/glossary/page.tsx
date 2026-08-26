import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

import { AdminDataTable } from '@/app/admin/_components/AdminDataTable';
import { AdminPageLayout } from '@/app/admin/_components/AdminPageLayout';

import { listGlossaryTermsForAdmin } from '@/lib/glossary-admin/queries';

export default async function AdminGlossaryListPage() {
  const t = await getTranslations({ locale: 'en', namespace: 'Admin.glossary' });
  const terms = await listGlossaryTermsForAdmin();

  return (
    <AdminPageLayout breadcrumbs={[{ label: t('title') }]}>
      <p className="text-sm text-muted-foreground mb-6">
        {t.rich('description', { code: (chunks) => <code className="text-xs">{chunks}</code> })}
      </p>

      <AdminDataTable
        headers={[
          t('columns.term'),
          t('columns.slug'),
          t('columns.category'),
          t('columns.theme'),
          t('columns.actions'),
        ]}
        items={terms}
        emptyMessage={t.rich('noTermsFound', { code: (chunks) => <code>{chunks}</code> })}
        renderRow={(term) => (
          <tr key={term.id} className="border-t border-border">
            <td className="px-4 py-3 font-medium">{term.termEn}</td>
            <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{term.slug}</td>
            <td className="px-4 py-3">{term.category}</td>
            <td className="px-4 py-3">
              {term.isTheme && (
                <span className="px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary">
                  {t('themeBadge')}
                </span>
              )}
            </td>
            <td className="px-4 py-3">
              <Link
                href={`/admin/glossary/${term.slug}`}
                className="text-primary hover:underline text-sm"
              >
                {t('edit')}
              </Link>
            </td>
          </tr>
        )}
      />
    </AdminPageLayout>
  );
}
