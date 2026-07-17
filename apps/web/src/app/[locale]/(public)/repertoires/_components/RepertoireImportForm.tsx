'use client';

import { useEffect, useRef, useState } from 'react';

import { useTranslations } from 'next-intl';

import { Button, FormErrorBanner, TextInput, Textarea } from '@/app/_components';
import { useRouter } from '@/i18n/routing';
import { FaPlus } from 'react-icons/fa';

import { detectOpeningIdsFromPgn } from '@/lib/repertoires/detect-openings';
import type { OpeningOption } from '@/lib/repertoires/opening-queries';
import type { RepertoirePhase, RepertoireSide } from '@/lib/repertoires/validation';
import { REPERTOIRE_NAME_MAX } from '@/lib/repertoires/validation';

import { createRepertoire } from '../_actions/createRepertoire';
import { OpeningLinksField } from './OpeningLinksField';
import { RepertoireBoardBuilder } from './RepertoireBoardBuilder';

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

type Props = {
  locale: string;
  openings: OpeningOption[];
  /** Prefills the PGN textarea — e.g. a finished game handed in by another feature. */
  initialPgn?: string;
  /** Prefills the side radio to match {@link initialPgn}'s player colour. */
  initialSide?: RepertoireSide;
};

/**
 * Import form for a repertoire (型): name, your side, the game phase, and a
 * PGN-with-variations. When the phase is `opening`, an opening picker links the
 * repertoire to one or more `chess_openings` (n:n). The PGN is decomposed
 * server-side into one line per variation; validation (move legality across all
 * variations) also happens in `createRepertoire`.
 */
export function RepertoireImportForm({ locale, openings, initialPgn, initialSide }: Props) {
  const t = useTranslations('Repertoires');
  const router = useRouter();

  const [name, setName] = useState('');
  const [side, setSide] = useState<RepertoireSide>(initialSide ?? 'white');
  const [phase, setPhase] = useState<RepertoirePhase>('opening');
  const [openingIds, setOpeningIds] = useState<string[]>([]);
  const [pgn, setPgn] = useState(initialPgn ?? '');
  // How the moves are entered: pasting a PGN or playing them on a board. Both
  // modes read and write the same `pgn` state — the board serializes its move
  // tree through it — so detection, validation and submission are shared.
  const [inputMode, setInputMode] = useState<'pgn' | 'board'>('pgn');
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
      // An error the form has copy for is shown as itself; anything else (an
      // unexpected server failure) falls back to the generic message.
      const key = `errors.${result.error}`;
      setError(t.has(key) ? t(key) : t('errors.generic'));
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
        <TextInput
          id="repertoire-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('form.namePlaceholder')}
          maxLength={REPERTOIRE_NAME_MAX}
          className="mt-1"
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
        <span className="block text-sm font-medium text-foreground">{t('form.pgnLabel')}</span>
        <div
          role="tablist"
          className="mt-2 inline-flex rounded-md border border-input p-0.5 text-sm"
        >
          {(['pgn', 'board'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              role="tab"
              aria-selected={inputMode === mode}
              onClick={() => setInputMode(mode)}
              className={`rounded px-3 py-1 transition-colors ${
                inputMode === mode
                  ? 'bg-link-primary/10 font-medium text-link-primary'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              {t(mode === 'pgn' ? 'form.inputModePgn' : 'form.inputModeBoard')}
            </button>
          ))}
        </div>
        {inputMode === 'pgn' ? (
          <>
            <p className="mt-2 text-xs text-muted-foreground">{t('form.pgnHelp')}</p>
            <Textarea
              id="repertoire-pgn"
              value={pgn}
              onChange={(e) => setPgn(e.target.value)}
              placeholder={t('form.pgnPlaceholder')}
              rows={10}
              inputSize="sm"
              className="mt-1 font-mono"
              aria-label={t('form.pgnLabel')}
            />
          </>
        ) : (
          <div className="mt-2">
            {/* Remounts on each switch, re-importing whatever the pgn state
                holds — so paste → board carries the moves over, and board →
                paste shows the serialized tree in the textarea. */}
            <RepertoireBoardBuilder side={side} initialPgn={pgn} onPgnChange={setPgn} />
          </div>
        )}
      </div>

      {phase === 'opening' && (
        <OpeningLinksField
          openings={openings}
          selectedIds={openingIds}
          onChange={changeOpeningIds}
        />
      )}

      <FormErrorBanner message={error} />

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
