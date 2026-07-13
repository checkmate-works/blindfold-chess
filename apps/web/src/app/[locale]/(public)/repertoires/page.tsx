/**
 * Repertoires (型) — list page (route slug /repertoires).
 *
 * @description
 * A user's repertoire courses (UGC, modelled on games): opening / middlegame /
 * endgame studies. Each card is one repertoire (name, side, phase); its lines
 * (variations) live inside it. The feature is concealed only by not being
 * linked from global nav while it is built out; the list lives under (public)
 * so an anonymous visitor simply sees the empty state.
 *
 * Cards reuse the shared `CatalogListCard` so they carry the same board
 * thumbnail, author, like, and comment affordances as the puzzle /
 * position-memory catalogs — repertoires are likeable/commentable via the same
 * polymorphic infrastructure (`targetType` / `topicType` = `'repertoire'`).
 *
 * @flow
 * 1. List the signed-in user's repertoires, newest first, with like + comment meta.
 * 2. The "Import" CTA (signed-in only) routes to /repertoires/new to paste a PGN.
 * 3. Each card links to /repertoires/[id].
 */
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { Button } from '@/app/_components';
import { Link } from '@/i18n/routing';
import { FaPlus } from 'react-icons/fa';

import { getOptionalUser } from '@/lib/auth';
import { getRepertoireCardMeta } from '@/lib/repertoires/card-meta';
import { listRepertoiresForUser } from '@/lib/repertoires/queries';

import { PageLayout, SectionTitle } from '@/app/[locale]/_components';
import { AdSlot } from '@/app/[locale]/_components/AdSense/AdSlot';
import { createPageMetadata } from '@/app/[locale]/_lib/metadata';
import type { LocalePageProps as Props } from '@/app/[locale]/_lib/types';

import { RepertoireListCard } from './_components/RepertoireListCard';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return createPageMetadata({
    params,
    namespace: 'Repertoires',
    path: 'repertoires',
    noIndex: true,
  });
}

export default async function RepertoiresPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Repertoires' });
  const user = await getOptionalUser();
  const rows = user ? await listRepertoiresForUser(user.id) : [];

  const cardMeta = await getRepertoireCardMeta(
    rows.map((r) => r.repertoire.id),
    user?.id
  );

  return (
    <PageLayout title={t('title')} locale={locale} breadcrumb={[{ label: t('title') }]}>
      <SectionTitle>{t('sectionTitle')}</SectionTitle>

      {rows.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">{t('empty')}</p>
      ) : (
        <div className="space-y-3">
          {rows.map((card) => (
            <RepertoireListCard
              key={card.repertoire.id}
              card={card}
              meta={cardMeta(card.repertoire.id)}
              locale={locale}
            />
          ))}
        </div>
      )}

      {user && (
        <div className="py-4">
          <Link href="/repertoires/new" locale={locale}>
            <Button asChild variant="primary" size="lg" icon={<FaPlus />} fullWidth>
              {t('importCta')}
            </Button>
          </Link>
        </div>
      )}

      <AdSlot slot="content-bottom" />
    </PageLayout>
  );
}
