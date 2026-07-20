import { getTranslations } from 'next-intl/server';

import type { RepertoireCardMeta } from '@/lib/repertoires/card-meta';
import type { RepertoireWithProfile } from '@/lib/repertoires/queries';

import { CatalogListCard } from '@/app/[locale]/_components/CatalogListCard';

import { toggleLike } from '../_actions/toggleLike';
import { RepertoireChips } from './RepertoireChips';

type Props = {
  card: RepertoireWithProfile;
  meta: RepertoireCardMeta;
  locale: string;
  /**
   * Show the phase chip. Off for a list already scoped to one phase — the
   * opening topic page can only ever list opening repertoires.
   */
  showPhase?: boolean;
  /**
   * Where the card navigates (locale-less; the i18n Link adds the prefix).
   * Defaults to the repertoire detail page — override when the card is a
   * choice in another flow (e.g. the kata check's picker).
   */
  detailHref?: string;
};

/**
 * One repertoire as a catalogue card: board thumbnail, author, like + comment
 * footer — the same shape the puzzle / position-memory catalogs use, via the
 * shared `CatalogListCard`. This wrapper pins everything that is true of a
 * repertoire card wherever it appears (its detail route, its i18n namespace, the
 * repertoire-scoped like action, its title chips), so the /repertoires list and
 * the opening page's Repertoires tab cannot drift apart.
 */
export async function RepertoireListCard({
  card,
  meta,
  locale,
  showPhase = true,
  detailHref,
}: Props) {
  const { repertoire, profile, thumbnailFen } = card;
  const t = await getTranslations({ locale, namespace: 'Repertoires' });

  return (
    <CatalogListCard
      id={repertoire.id}
      fen={thumbnailFen}
      title={repertoire.name}
      description={repertoire.description}
      createdAt={repertoire.createdAt}
      profile={profile}
      likeMeta={meta.likeMeta}
      replyMeta={meta.replyMeta}
      detailHref={detailHref ?? `/repertoires/${repertoire.id}`}
      i18nNamespace="Repertoires"
      toggleLikeAction={toggleLike}
      justNowLabel={t('justNow')}
      locale={locale}
      topicKey={repertoire.id}
      badge={
        <RepertoireChips
          locale={locale}
          side={repertoire.side}
          phase={showPhase ? repertoire.phase : undefined}
          status={repertoire.status}
        />
      }
    />
  );
}
