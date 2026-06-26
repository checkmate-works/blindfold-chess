import Link from 'next/link';

import { AdminPageHeader } from '@/app/admin/_components/AdminPageHeader';

import { listGlossaryTermsForAdmin } from '@/lib/glossary-admin/queries';

export default async function AdminGlossaryListPage() {
  const terms = await listGlossaryTermsForAdmin();

  return (
    <div>
      <AdminPageHeader breadcrumbs={[{ label: 'Glossary' }]} />
      <p className="text-sm text-muted-foreground mb-6">
        Term definitions and translations are managed in code (
        <code className="text-xs">src/lib/db/data/terms/*.ts</code>). The admin UI only edits the
        visual layer (annotations) and the chunk associations.
      </p>

      <ul className="divide-y divide-border border border-border rounded">
        {terms.map((term) => (
          <li key={term.id}>
            <Link
              href={`/admin/glossary/${term.slug}`}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 hover:bg-muted transition-colors"
            >
              <span className="font-medium text-foreground">{term.termEn}</span>
              <span className="text-xs text-muted-foreground font-mono">{term.slug}</span>
              <span className="ml-auto text-xs text-muted-foreground">{term.category}</span>
              {term.isTheme && (
                <span className="px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary">
                  theme
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>

      {terms.length === 0 && (
        <p className="text-muted-foreground">
          No glossary terms yet. Run <code>pnpm db:seed</code>.
        </p>
      )}
    </div>
  );
}
