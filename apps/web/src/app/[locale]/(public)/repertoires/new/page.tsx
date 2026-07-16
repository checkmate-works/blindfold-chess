/**
 * Repertoires (型) — import page. Paste a PGN-with-variations to create a new
 * repertoire; it is decomposed into one line per variation.
 */
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { getAuthenticatedUser } from '@/lib/auth';
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
  await getAuthenticatedUser();
  const openings = await getOpeningOptions(locale);

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
      />
    </PageLayout>
  );
}
