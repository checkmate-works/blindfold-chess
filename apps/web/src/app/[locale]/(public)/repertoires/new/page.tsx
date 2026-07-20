/**
 * Repertoires (型) — creation page. Play moves on a board or paste a
 * PGN-with-variations to create a new repertoire; it is decomposed into one
 * line per variation. UI copy says "create/new" — "import" is only how PGN
 * pasted from another platform gets in, not how the feature is framed to
 * users (see `RepertoireImportForm`, whose internal naming stays as-is).
 */
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { eq } from 'drizzle-orm';

import { getAuthenticatedUser } from '@/lib/auth';
import { db, profiles } from '@/lib/db';
import { getOpeningOptions } from '@/lib/repertoires/opening-queries';

import { PageLayout, SectionTitle } from '@/app/[locale]/_components';
import { createPageMetadata } from '@/app/[locale]/_lib/metadata';
import type { LocaleSearchPageProps as Props } from '@/app/[locale]/_lib/types';

import { RepertoireImportForm } from '../_components/RepertoireImportForm';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return createPageMetadata({
    params,
    namespace: 'Repertoires',
    path: 'repertoires/new',
    titleKey: 'new.title',
    noIndex: true,
    omitDescription: true,
  });
}

export default async function NewLinePage({ params, searchParams }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Repertoires' });
  const user = await getAuthenticatedUser();
  const openings = await getOpeningOptions(locale);

  // Prefill the required name so a quick import never stalls on it. A
  // provisional user (no profile row yet) gets no prefill — there is no
  // username to build it from.
  const [profile] = await db
    .select({ username: profiles.username })
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1);
  const initialName = profile ? t('form.defaultName', { username: profile.username }) : undefined;

  // Optional prefill from another feature handing the player a game to turn
  // into a repertoire (e.g. the kata check's "none of your kata cover this
  // opening" CTA, which links here with the finished game's own PGN + side).
  const sp = await searchParams;
  const initialPgn = typeof sp.pgn === 'string' && sp.pgn ? sp.pgn : undefined;
  const initialSide = sp.side === 'black' ? 'black' : sp.side === 'white' ? 'white' : undefined;

  return (
    <PageLayout
      title={t('new.title')}
      locale={locale}
      breadcrumb={[{ label: t('title'), href: '/repertoires' }, { label: t('new.title') }]}
    >
      <SectionTitle>{t('new.sectionTitle')}</SectionTitle>
      <RepertoireImportForm
        locale={locale}
        openings={openings}
        initialPgn={initialPgn}
        initialSide={initialSide}
        initialName={initialName}
      />
    </PageLayout>
  );
}
