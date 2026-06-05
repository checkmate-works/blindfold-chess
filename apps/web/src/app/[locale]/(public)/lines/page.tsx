/**
 * Lines (型) — list page.
 *
 * @description
 * A logged-in user's private repertoire trees: opening lines, checkmate
 * patterns, or any memorized continuation from a fixed position. Each row is
 * one tree imported as PGN-with-variations. The feature is intentionally not
 * surfaced in global navigation yet (early access), but the list itself lives
 * under (public) so it can be viewed without signing in — an anonymous visitor
 * simply sees the empty state (lines stay private to their owner; import and
 * detail remain auth-gated via `getAuthenticatedUser`).
 *
 * @flow
 * 1. The page lists the signed-in user's lines, newest first, with a side badge
 *    and a quick tree summary (lines · moves). Anonymous visitors see empty.
 * 2. The "Import" CTA (signed-in only) routes to /lines/new to paste a PGN.
 * 3. Each row links to /lines/[id] for a board preview and the raw PGN.
 */
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { Button } from '@/app/_components';
import { Link } from '@/i18n/routing';
import { FaPlus } from 'react-icons/fa';

import { getOptionalUser } from '@/lib/auth';
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
  const user = await getOptionalUser();
  const lines = user ? await listLinesForUser(user.id) : [];

  return (
    <PageLayout title={t('title')} locale={locale} breadcrumb={[{ label: t('title') }]}>
      <SectionTitle>{t('sectionTitle')}</SectionTitle>

      {lines.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">{t('empty')}</p>
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

      {user && (
        <div className="py-4">
          <Link href="/lines/new" locale={locale}>
            <Button asChild variant="primary" size="lg" icon={<FaPlus />} fullWidth>
              {t('importCta')}
            </Button>
          </Link>
        </div>
      )}
    </PageLayout>
  );
}
