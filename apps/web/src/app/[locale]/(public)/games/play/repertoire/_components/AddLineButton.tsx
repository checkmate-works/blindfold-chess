'use client';

import { useState } from 'react';

import { Button, FormErrorBanner } from '@/app/_components';
import { useRouter } from '@/i18n/routing';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { addLine } from '@/app/[locale]/(public)/repertoires/[id]/_actions/addLine';

type Props = {
  locale: string;
  repertoireId: string;
  repertoireName: string;
  /** The candidate line's move text (root-to-leaf, matched prefix included) — precomputed server-side. */
  pgn: string;
};

const KNOWN_ERRORS = new Set([
  'unauthorized',
  'notFound',
  'nameTooLong',
  'pgnRequired',
  'pgnTooLarge',
  'invalidPgn',
  'noMoves',
]);

/**
 * Turns a kata check's divergence into a new line on the repertoire it
 * diverged from: "this game did something the kata doesn't cover yet — save
 * it as a new prepared line?" Expands into a read-only preview of the exact
 * moves to be saved before writing anything (the game's moves from where it
 * entered the kata through the end of the game — the matched prefix is
 * included on purpose, since a repertoire line always runs root-to-leaf).
 */
export function AddLineButton({ locale, repertoireId, repertoireName, pgn }: Props) {
  const t = useTranslations('play.kataPage.addLine');
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setPending(true);
    setError(null);
    const result = await addLine({ repertoireId, locale, name: null, pgn });
    if (!result.ok) {
      setPending(false);
      setError(KNOWN_ERRORS.has(result.error) ? t(`errors.${result.error}`) : t('errors.generic'));
      return;
    }
    router.push(`/repertoires/${repertoireId}/lines/${result.lineNo}?toast=line_added`);
  }

  if (!expanded) {
    return (
      <Button variant="outline" onClick={() => setExpanded(true)}>
        {t('cta')}
      </Button>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-border bg-background p-3">
      <p className="text-sm text-foreground">{t('confirmDetail', { repertoireName })}</p>
      <p className="overflow-x-auto whitespace-pre-wrap rounded bg-muted p-2 font-mono text-xs text-muted-foreground">
        {pgn}
      </p>
      <FormErrorBanner message={error} />
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="primary" onClick={handleSave} loading={pending} disabled={pending}>
          {pending ? t('saving') : t('save')}
        </Button>
        <button
          type="button"
          onClick={() => setExpanded(false)}
          disabled={pending}
          className="text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
        >
          {t('cancel')}
        </button>
      </div>
    </div>
  );
}
