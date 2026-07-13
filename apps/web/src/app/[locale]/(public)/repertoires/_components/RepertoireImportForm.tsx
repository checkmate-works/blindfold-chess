'use client';

import { useEffect, useRef, useState } from 'react';

import { useTranslations } from 'next-intl';

import { Button } from '@/app/_components/Button';
import { useRouter } from '@/i18n/routing';
import { FaPlus } from 'react-icons/fa';

import { detectOpeningIdsFromPgn } from '@/lib/repertoires/detect-openings';
import type { OpeningOption } from '@/lib/repertoires/opening-queries';
import type { RepertoirePhase, RepertoireSide } from '@/lib/repertoires/validation';

import { createRepertoire } from '../_actions/createRepertoire';
import { OpeningMultiSelect } from './OpeningMultiSelect';

const KNOWN_ERROR_KEYS = new Set([
  'nameRequired',
  'nameTooLong',
  'invalidSide',
  'invalidPhase',
  'pgnRequired',
  'pgnTooLarge',
  'invalidPgn',
  'signInRequired',
  'banned',
  'rateLimited',
]);

const PHASES: readonly RepertoirePhase[] = ['opening', 'middlegame', 'endgame'];

/**
 * Only `opening` can be authored today: a middlegame or endgame repertoire is
 * meaningless without a custom starting position, and this form has no way to
 * set one (the PGN is assumed to start from the standard position). The other
 * two phases stay visible — the schema and the browse pages already support
 * them — but are locked behind a "coming soon" affordance until a starting-
 * position picker exists. Unlock by removing the disabled/overlay branch here.
 */
const AUTHORABLE_PHASES: readonly RepertoirePhase[] = ['opening'];

type Props = { locale: string; openings: OpeningOption[] };

/**
 * Import form for a repertoire (型): name, your side, the game phase, and a
 * PGN-with-variations. When the phase is `opening`, an opening picker links the
 * repertoire to one or more `chess_openings` (n:n). The PGN is decomposed
 * server-side into one line per variation; validation (move legality across all
 * variations) also happens in `createRepertoire`.
 */
export function RepertoireImportForm({ locale, openings }: Props) {
  const t = useTranslations('Repertoires');
  const router = useRouter();

  const [name, setName] = useState('');
  const [side, setSide] = useState<RepertoireSide>('white');
  const [phase, setPhase] = useState<RepertoirePhase>('opening');
  const [openingIds, setOpeningIds] = useState<string[]>([]);
  const [pgn, setPgn] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Once the author picks or removes an opening by hand, the PGN stops driving
  // the links — auto-detection is a starting point, not a correction.
  const openingsEdited = useRef(false);

  // Derive the opening links from what was pasted, while the author hasn't
  // touched the picker. Debounced so a long PGN isn't re-parsed per keystroke.
  useEffect(() => {
    if (phase !== 'opening' || openingsEdited.current) return;
    const timer = setTimeout(() => {
      setOpeningIds(detectOpeningIdsFromPgn(pgn, openings));
    }, 300);
    return () => clearTimeout(timer);
  }, [pgn, phase, openings]);

  function changePhase(next: RepertoirePhase) {
    setPhase(next);
    // Opening links only make sense for opening repertoires.
    if (next !== 'opening') setOpeningIds([]);
  }

  function changeOpeningIds(ids: string[]) {
    openingsEdited.current = true;
    setOpeningIds(ids);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const result = await createRepertoire({
      name,
      side,
      phase,
      pgn,
      openingIds: phase === 'opening' ? openingIds : [],
      locale,
    });
    if ('error' in result) {
      setPending(false);
      setError(
        KNOWN_ERROR_KEYS.has(result.error) ? t(`errors.${result.error}`) : t('errors.generic')
      );
      return;
    }
    router.push(`/repertoires/${result.id}`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="repertoire-name" className="block text-sm font-medium text-foreground">
          {t('form.nameLabel')}
        </label>
        <input
          id="repertoire-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('form.namePlaceholder')}
          maxLength={120}
          className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-link-primary"
        />
      </div>

      <fieldset>
        <legend className="block text-sm font-medium text-foreground">{t('form.sideLabel')}</legend>
        <div className="mt-2 flex gap-4">
          {(['white', 'black'] as const).map((value) => (
            <label key={value} className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="radio"
                name="side"
                value={value}
                checked={side === value}
                onChange={() => setSide(value)}
              />
              {t(`form.side_${value}`)}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="block text-sm font-medium text-foreground">
          {t('form.phaseLabel')}
        </legend>
        <div className="mt-2 flex flex-wrap gap-4">
          {PHASES.map((value) => {
            const locked = !AUTHORABLE_PHASES.includes(value);
            return (
              <label
                key={value}
                className={`flex items-center gap-2 text-sm ${
                  locked ? 'cursor-not-allowed text-muted-foreground' : 'text-foreground'
                }`}
              >
                <input
                  type="radio"
                  name="phase"
                  value={value}
                  checked={phase === value}
                  disabled={locked}
                  onChange={() => changePhase(value)}
                />
                {t(`form.phase_${value}`)}
                {locked && (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    {t('form.phaseComingSoon')}
                  </span>
                )}
              </label>
            );
          })}
        </div>
      </fieldset>

      <div>
        <label htmlFor="repertoire-pgn" className="block text-sm font-medium text-foreground">
          {t('form.pgnLabel')}
        </label>
        <p className="mt-1 text-xs text-muted-foreground">{t('form.pgnHelp')}</p>
        <textarea
          id="repertoire-pgn"
          value={pgn}
          onChange={(e) => setPgn(e.target.value)}
          placeholder={t('form.pgnPlaceholder')}
          rows={10}
          className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 font-mono text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-link-primary"
        />
      </div>

      {phase === 'opening' && (
        <div>
          <span className="block text-sm font-medium text-foreground">
            {t('form.openingLabel')}
          </span>
          <p className="mt-1 text-xs text-muted-foreground">{t('form.openingHelp')}</p>
          <div className="mt-2">
            <OpeningMultiSelect
              openings={openings}
              selectedIds={openingIds}
              onChange={changeOpeningIds}
            />
          </div>
        </div>
      )}

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/30 dark:text-red-200">
          {error}
        </p>
      )}

      <div className="py-4">
        <Button
          type="submit"
          variant="primary"
          size="lg"
          icon={<FaPlus />}
          fullWidth
          loading={pending}
        >
          {t('form.submit')}
        </Button>
      </div>
    </form>
  );
}
