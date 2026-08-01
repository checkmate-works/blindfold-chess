import { getTranslations } from 'next-intl/server';

import { Link } from '@/i18n/routing';

import type { Repertoire } from '@/lib/db';

import { RepertoireDraftBadge } from './RepertoireDraftBadge';

const CHIP = 'rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground';
/** The side chip doubles as a filter link, so it gets a hover affordance. */
const SIDE_CHIP = `${CHIP} transition-colors hover:bg-muted-foreground/20 hover:text-foreground`;

type Props = {
  locale: string;
  side: Repertoire['side'];
  /**
   * Omit on a list already scoped to one phase. `'opening'` is never shown
   * even when passed — it's currently the only authorable phase (see the
   * import form's `AUTHORABLE_PHASES`), so the chip would be a constant with
   * no information. A future middlegame / endgame kata would show its chip.
   */
  phase?: Repertoire['phase'];
  /**
   * The visibility/lifecycle chip. `'building'` shows the draft badge;
   * `'followers_only'` / `'private'` show their tier so the owner (and, on a
   * followers-only course, its viewers) can see it isn't public at a glance.
   * `'public'` shows no chip — public is the unremarkable default. Omit on
   * lists already scoped to public.
   */
  status?: Repertoire['status'];
};

/**
 * The at-a-glance facts about a repertoire: which colour it is written for,
 * which phase of the game it covers, and — only while `building` — that it
 * isn't published yet. Rendered as the card's title badge and on the detail
 * page's summary row, so the two never drift apart.
 *
 * The side chip links to the catalog filtered to that colour
 * (`/repertoires?side=…`); on a card it's a distinct interactive child above
 * the card's stretched detail link (like the author avatar), so it filters
 * rather than opening the card.
 */
export async function RepertoireChips({ locale, side, phase, status }: Props) {
  const t = await getTranslations({ locale, namespace: 'Repertoires' });

  return (
    <span className="flex flex-wrap gap-1">
      {/* The badge is the only "not published yet" signal left now that the
          publish banner is gone (publish moved into the "⋯" menu), so it
          carries the consequence — invisible to everyone else — as its tooltip
          rather than as a block of copy above the board. On the detail page
          the same badge sits next to the title instead (see `[id]/page.tsx`),
          so `status` is not passed here for a draft. */}
      {status === 'building' && (
        <RepertoireDraftBadge label={t('status.building')} hint={t('status.buildingHint')} />
      )}
      {status === 'followers_only' && <span className={CHIP}>{t('status.followersOnly')}</span>}
      {status === 'private' && <span className={CHIP}>{t('status.private')}</span>}
      <Link
        href={`/repertoires?side=${side}`}
        locale={locale}
        className={SIDE_CHIP}
        title={t('detail.filterBySide', { side: t(`form.side_${side}`) })}
      >
        {t(`form.side_${side}`)}
      </Link>
      {phase && phase !== 'opening' && <span className={CHIP}>{t(`form.phase_${phase}`)}</span>}
    </span>
  );
}
