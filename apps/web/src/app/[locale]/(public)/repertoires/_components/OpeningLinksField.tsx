'use client';

import { useTranslations } from 'next-intl';

import type { OpeningOption } from '@/lib/repertoires/opening-queries';

import { OpeningMultiSelect } from './OpeningMultiSelect';

type Props = {
  openings: OpeningOption[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
};

/**
 * The "which openings does this cover?" field — label, help text, and the
 * multi-select over the `chess_openings` master. Shared by the import form and
 * the edit form: the links are the same n:n set on both, so the field asks for
 * them the same way. Rendered only for an opening-phase repertoire; the callers
 * own that condition, since only they know the phase.
 */
export function OpeningLinksField({ openings, selectedIds, onChange }: Props) {
  const t = useTranslations('Repertoires.form');

  return (
    <div>
      <span className="block text-sm font-medium text-foreground">{t('openingLabel')}</span>
      <p className="mt-1 text-xs text-muted-foreground">{t('openingHelp')}</p>
      <div className="mt-2">
        <OpeningMultiSelect openings={openings} selectedIds={selectedIds} onChange={onChange} />
      </div>
    </div>
  );
}
