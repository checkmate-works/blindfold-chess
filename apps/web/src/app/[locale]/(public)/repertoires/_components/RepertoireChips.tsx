import { getTranslations } from 'next-intl/server';

import type { Repertoire } from '@/lib/db';

const CHIP = 'rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground';
const BUILDING_CHIP =
  'rounded-full bg-warning-soft px-2 py-0.5 text-xs text-warning-soft-foreground';

type Props = {
  locale: string;
  side: Repertoire['side'];
  /** Omit on a list that is already scoped to one phase. */
  phase?: Repertoire['phase'];
  /**
   * Show the "in progress" chip when `'building'`. Omit (or pass `'public'` /
   * `'private'`) elsewhere — every existing caller only ever renders
   * already-public repertoires, so this defaults to invisible for them.
   */
  status?: Repertoire['status'];
};

/**
 * The at-a-glance facts about a repertoire: which colour it is written for,
 * which phase of the game it covers, and — only while `building` — that it
 * isn't published yet. Rendered as the card's title badge and on the detail
 * page's summary row, so the two never drift apart.
 */
export async function RepertoireChips({ locale, side, phase, status }: Props) {
  const t = await getTranslations({ locale, namespace: 'Repertoires' });

  return (
    <span className="flex flex-wrap gap-1">
      {status === 'building' && <span className={BUILDING_CHIP}>{t('status.building')}</span>}
      <span className={CHIP}>{t(`form.side_${side}`)}</span>
      {phase && <span className={CHIP}>{t(`form.phase_${phase}`)}</span>}
    </span>
  );
}
