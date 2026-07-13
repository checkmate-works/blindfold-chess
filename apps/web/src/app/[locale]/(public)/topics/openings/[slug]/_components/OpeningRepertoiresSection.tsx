import { getTranslations } from 'next-intl/server';

import { getRepertoireCardMeta } from '@/lib/repertoires/card-meta';
import type { RepertoireSort } from '@/lib/repertoires/queries';
import { listPublicRepertoiresForOpening } from '@/lib/repertoires/queries';

import { RepertoireListCard } from '@/app/[locale]/(public)/repertoires/_components/RepertoireListCard';
import { SortSelect } from '@/app/[locale]/(public)/topics/_components/SortSelect';
import type { Locale } from '@/app/[locale]/_lib/types';

/** How many repertoires the strip shows. There is no public index to link on to. */
const MAX_REPERTOIRES = 6;

type Props = {
  locale: Locale;
  slug: string;
  sort: RepertoireSort;
  /** How many exist in total — the tab label's number, and what decides the empty state. */
  count: number;
  currentUserId?: string;
};

/**
 * The repertoires (型) that cover this opening — the same catalogue card the
 * /repertoires list uses, so a reader studying an opening can jump straight into
 * someone's prepared lines. The panel behind the "Repertoires" tab; the tab row
 * above owns the heading, so this renders its sort control and its cards.
 *
 * The phase chip is dropped: everything listed here is an opening repertoire by
 * construction, so the chip would say the same thing on every card.
 */
export async function OpeningRepertoiresSection({
  locale,
  slug,
  sort,
  count,
  currentUserId,
}: Props) {
  const t = await getTranslations({ locale, namespace: 'Repertoires' });

  if (count === 0) {
    return <p className="py-8 text-center text-muted-foreground">{t('empty')}</p>;
  }

  const rows = await listPublicRepertoiresForOpening(slug, MAX_REPERTOIRES, sort);
  const cardMeta = await getRepertoireCardMeta(
    rows.map((r) => r.repertoire.id),
    currentUserId
  );

  return (
    <>
      <SortSelect
        basePath={`/topics/openings/${slug}`}
        translationKey="topics.openings.sort"
        currentSort={sort}
        modes={['new', 'popular']}
      />

      <div className="space-y-3">
        {rows.map((card) => (
          <RepertoireListCard
            key={card.repertoire.id}
            card={card}
            meta={cardMeta(card.repertoire.id)}
            locale={locale}
            showPhase={false}
          />
        ))}
      </div>
    </>
  );
}
