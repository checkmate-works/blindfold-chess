import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { AdminPageLayout } from '@/app/admin/_components/AdminPageLayout';

import { getGlossaryTermForAdmin } from '@/lib/glossary-admin/queries';

import { TermPositionEditor } from '../_components/TermPositionEditor';

export default async function AdminGlossaryTermPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const t = await getTranslations({ locale: 'en', namespace: 'Admin.glossary' });

  const term = await getGlossaryTermForAdmin(slug);
  if (!term) {
    notFound();
  }

  return (
    <AdminPageLayout
      breadcrumbs={[{ label: t('navLabel'), href: '/admin/glossary' }, { label: term.termEn }]}
    >
      <p className="text-sm font-mono text-muted-foreground mb-6">{term.slug}</p>

      <div className="mb-8 rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
          {t('detail.headerTitle')}
        </h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6 text-sm">
          <div>
            <dt className="text-muted-foreground">{t('detail.slug')}</dt>
            <dd className="font-mono">{term.slug}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t('detail.category')}</dt>
            <dd>{term.category}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t('detail.theme')}</dt>
            <dd>{term.isTheme ? t('detail.yes') : t('detail.no')}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t('detail.examplePositions')}</dt>
            <dd>{term.positions.length}</dd>
          </div>
        </dl>
      </div>

      <h2 className="text-lg font-semibold mb-3">{t('detail.positionsTitle')}</h2>
      <p className="text-sm text-muted-foreground mb-4">
        {t.rich('detail.positionsDescription', {
          code: (chunks) => <code className="text-xs">{chunks}</code>,
        })}
      </p>

      <section>
        {term.positions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t.rich('detail.noPositions', { code: (chunks) => <code>{chunks}</code> })}
          </p>
        ) : (
          <div className="space-y-4">
            {term.positions.map((pos) => (
              <TermPositionEditor
                key={pos.id}
                rowId={pos.id}
                termSlug={term.slug}
                fen={pos.fen}
                caption={pos.caption}
                initialAnnotations={pos.annotations}
              />
            ))}
          </div>
        )}
      </section>
    </AdminPageLayout>
  );
}
