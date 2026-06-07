/**
 * Position resolver — per-move comment threads are keyed by position hash (not
 * line + ply), so notification deep links point here. We find a current line +
 * ply in the repertoire that reaches the position and redirect to that move's
 * thread. `?post=<id>` (if present) becomes the `#post-<id>` anchor on the
 * destination so the exact comment is scrolled into view.
 */
import { redirect } from 'next/navigation';

import { resolveLineForPosition } from '@/lib/repertoires/resolve-line-position';

import type { Locale } from '@/app/[locale]/_lib/types';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ locale: Locale; id: string; hash: string }>;
  searchParams: Promise<{ post?: string }>;
};

export default async function RepertoirePositionResolverPage({ params, searchParams }: Props) {
  const { locale, id, hash } = await params;
  const post = (await searchParams).post;

  const resolved = await resolveLineForPosition(id, hash);
  if (!resolved) {
    redirect(`/${locale}/repertoires/${id}`);
  }

  const anchor = post ? `#post-${post}` : '';
  redirect(`/${locale}/repertoires/${id}/lines/${resolved.lineNo}?move=${resolved.ply}${anchor}`);
}
