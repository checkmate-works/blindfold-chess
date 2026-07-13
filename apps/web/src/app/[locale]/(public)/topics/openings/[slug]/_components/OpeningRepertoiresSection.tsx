import { getRepertoireCardMeta } from '@/lib/repertoires/card-meta';
import type { RepertoireSort } from '@/lib/repertoires/queries';
import { listPublicRepertoiresForOpening } from '@/lib/repertoires/queries';

import { RepertoireListCard } from '@/app/[locale]/(public)/repertoires/_components/RepertoireListCard';
import type { Locale } from '@/app/[locale]/_lib/types';

/** How many repertoires the strip shows. There is no public index to link on to. */
const MAX_REPERTOIRES = 6;

type Props = {
  locale: Locale;
  slug: string;
  sort: RepertoireSort;
  currentUserId?: string;
};

/**
 * The repertoires (型) that cover this opening — the same catalogue card the
 * /repertoires list uses, so a reader studying an opening can jump straight
 * into someone's prepared lines. The panel behind the "Repertoires" tab; the
 * tab row owns the heading, so this renders cards only.
 *
 * The phase chip is dropped: everything listed here is an opening repertoire by
 * construction, so the chip would say the same thing on every card.
 */
export async function OpeningRepertoiresSection({ locale, slug, sort, currentUserId }: Props) {
  const rows = await listPublicRepertoiresForOpening(slug, MAX_REPERTOIRES, sort);
  if (rows.length === 0) return null;

  const cardMeta = await getRepertoireCardMeta(
    rows.map((r) => r.repertoire.id),
    currentUserId
  );

  return (
    <section className="space-y-3">
      {rows.map((card) => (
        <RepertoireListCard
          key={card.repertoire.id}
          card={card}
          meta={cardMeta(card.repertoire.id)}
          locale={locale}
          showPhase={false}
        />
      ))}
    </section>
  );
}
