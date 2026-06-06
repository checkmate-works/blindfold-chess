'use client';

import { useState } from 'react';

import { useTranslations } from 'next-intl';

import { Button } from '@/app/_components/Button';
import { useRouter } from '@/i18n/routing';
import { FaPlus } from 'react-icons/fa';

import type { RepertoirePhase, RepertoireSide } from '@/lib/repertoires/validation';

import { createRepertoire } from '../_actions/createRepertoire';

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

type Props = { locale: string };

/**
 * Import form for a repertoire (型): name, your side, the game phase, and a
 * PGN-with-variations. The PGN is decomposed server-side into one line per
 * variation; validation (move legality across all variations) also happens in
 * `createRepertoire`, and this surfaces the typed error it returns.
 */
export function RepertoireImportForm({ locale }: Props) {
  const t = useTranslations('Lines');
  const router = useRouter();

  const [name, setName] = useState('');
  const [side, setSide] = useState<RepertoireSide>('white');
  const [phase, setPhase] = useState<RepertoirePhase>('opening');
  const [pgn, setPgn] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const result = await createRepertoire({ name, side, phase, pgn, locale });
    if ('error' in result) {
      setPending(false);
      setError(
        KNOWN_ERROR_KEYS.has(result.error) ? t(`errors.${result.error}`) : t('errors.generic')
      );
      return;
    }
    router.push(`/lines/${result.id}`);
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
          {PHASES.map((value) => (
            <label key={value} className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="radio"
                name="phase"
                value={value}
                checked={phase === value}
                onChange={() => setPhase(value)}
              />
              {t(`form.phase_${value}`)}
            </label>
          ))}
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
