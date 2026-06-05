/**
 * Lines (型) — list page.
 *
 * @description
 * A logged-in user's private repertoire trees: opening lines, checkmate
 * patterns, or any memorized continuation from a fixed position. Each row is
 * one tree imported as PGN-with-variations. The feature is intentionally not
 * surfaced in global navigation yet (early access); it lives under (protected)
 * so it still requires sign-in.
 *
 * @flow
 * 1. The page lists the user's lines, newest first, with a side badge and a
 *    quick tree summary (lines · moves).
 * 2. "Import" routes to /lines/new to paste a PGN.
 * 3. Each row links to /lines/[id] for a board preview and the raw PGN.
 */
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { Link } from '@/i18n/routing';

import { getAuthenticatedUser } from '@/lib/auth';
import { listLinesForUser } from '@/lib/lines/queries';
import { summarizeLinePgn } from '@/lib/lines/validation';

import { PageLayout, SectionTitle } from '@/app/[locale]/_components';
import { createPageMetadata } from '@/app/[locale]/_lib/metadata';
import type { LocalePageProps as Props } from '@/app/[locale]/_lib/types';

import { DeleteLineButton } from './_components/DeleteLineButton';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return createPageMetadata({ params, namespace: 'Lines', path: 'lines', noIndex: true });
}

export default async function LinesPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Lines' });
  const user = await getAuthenticatedUser();
  const lines = await listLinesForUser(user.id);

  return (
    <PageLayout title={t('title')} locale={locale} breadcrumb={[{ label: t('title') }]}>
      <div className="mb-6 flex items-center justify-between gap-4">
        <SectionTitle>{t('sectionTitle')}</SectionTitle>
        <Link
          href="/lines/new"
          locale={locale}
          className="shrink-0 rounded-lg bg-link-primary px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          {t('importCta')}
        </Link>
      </div>

      {lines.length === 0 ? (
        <p className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
          {t('empty')}
        </p>
      ) : (
        <ul className="space-y-3">
          {lines.map((line) => {
            const summary = summarizeLinePgn(line.pgn);
            return (
              <li
                key={line.id}
                className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-4"
              >
                <div className="min-w-0">
                  <Link
                    href={`/lines/${line.id}`}
                    locale={locale}
                    className="font-medium text-foreground hover:underline"
                  >
                    {line.name}
                  </Link>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="rounded-full bg-muted px-2 py-0.5">
                      {t(`form.side_${line.side}`)}
                    </span>
                    <span>
                      {t('summary', {
                        lines: summary.lineCount,
                        moves: summary.moveCount,
                      })}
                    </span>
                    <span>{new Date(line.createdAt).toLocaleDateString(locale)}</span>
                  </div>
                </div>
                <DeleteLineButton id={line.id} locale={locale} afterDelete="refresh" />
              </li>
            );
          })}
        </ul>
      )}
    </PageLayout>
  );
}
