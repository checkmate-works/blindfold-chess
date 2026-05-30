import { notFound } from 'next/navigation';

import { AdminPageHeader } from '@/app/admin/_components/AdminPageHeader';

import { getGlossaryTermForAdmin } from '@/lib/glossary-admin/queries';

import { TermPositionEditor } from '../_components/TermPositionEditor';

export default async function AdminGlossaryTermPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const term = await getGlossaryTermForAdmin(slug);
  if (!term) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <AdminPageHeader
        breadcrumbs={[{ label: 'Glossary', href: '/admin/glossary' }, { label: term.termEn }]}
      />

      <header className="space-y-1">
        <p className="text-sm text-muted-foreground">
          <span className="font-mono">{term.slug}</span> &middot; {term.category}
          {term.isTheme && <span className="ml-2 text-primary">theme</span>}
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Example Positions</h2>
        <p className="text-sm text-muted-foreground">
          The FEN, caption, and sort order are managed in code (
          <code className="text-xs">src/lib/db/data/terms/*.ts</code>). Use the editor below to draw
          arrows and circles — each row saves independently. Positions tagged with this theme are
          managed from the position editor side via <code className="text-xs">position_themes</code>
          , not here.
        </p>

        {term.positions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No example positions seeded for this term. Add one in the code data file and re-run{' '}
            <code>pnpm db:seed</code>.
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
    </div>
  );
}
