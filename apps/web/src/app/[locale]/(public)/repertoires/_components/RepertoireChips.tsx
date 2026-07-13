import { getTranslations } from 'next-intl/server';

import type { Repertoire } from '@/lib/db';

const CHIP = 'rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground';

type Props = {
  locale: string;
  side: Repertoire['side'];
  /** Omit on a list that is already scoped to one phase. */
  phase?: Repertoire['phase'];
};

/**
 * The at-a-glance facts about a repertoire: which colour it is written for, and
 * which phase of the game it covers. Rendered as the card's title badge and on
 * the detail page's summary row, so the two never drift apart.
 */
export async function RepertoireChips({ locale, side, phase }: Props) {
  const t = await getTranslations({ locale, namespace: 'Repertoires' });

  return (
    <span className="flex flex-wrap gap-1">
      <span className={CHIP}>{t(`form.side_${side}`)}</span>
      {phase && <span className={CHIP}>{t(`form.phase_${phase}`)}</span>}
    </span>
  );
}
