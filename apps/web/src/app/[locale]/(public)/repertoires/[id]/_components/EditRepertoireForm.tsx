'use client';

import { useState } from 'react';

import { useTranslations } from 'next-intl';

import { Button, FormErrorBanner, TextInput } from '@/app/_components';
import { useRouter } from '@/i18n/routing';

import type { OpeningOption } from '@/lib/repertoires/opening-queries';
import { REPERTOIRE_NAME_MAX } from '@/lib/repertoires/validation';

import { OpeningLinksField } from '../../_components/OpeningLinksField';
import { updateRepertoire } from '../_actions/updateRepertoire';

type Props = {
  locale: string;
  repertoireId: string;
  initialName: string;
  /** The opening master; empty for a non-opening repertoire (picker hidden). */
  openings: OpeningOption[];
  initialOpeningIds: string[];
  /** Opening links only exist for an `opening`-phase repertoire. */
  canLinkOpenings: boolean;
};

/**
 * Owner-only editor for a repertoire's metadata: its title and, for an
 * opening-phase repertoire, the openings it is linked to (n:n — a transposing
 * repertoire may name several).
 *
 * Scope stops there on purpose. Side / phase / PGN decide the lines and every
 * position-keyed annotation hanging off them, so re-shaping those is a
 * re-import rather than an edit — see `updateRepertoireDetails`.
 */
export function EditRepertoireForm({
  locale,
  repertoireId,
  initialName,
  openings,
  initialOpeningIds,
  canLinkOpenings,
}: Props) {
  const t = useTranslations('Repertoires.edit');
  const router = useRouter();

  const [name, setName] = useState(initialName);
  const [openingIds, setOpeningIds] = useState<string[]>(initialOpeningIds);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const detailHref = `/repertoires/${repertoireId}`;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const result = await updateRepertoire({
      repertoireId,
      locale,
      name,
      openingIds: canLinkOpenings ? openingIds : [],
    });
    if (!result.ok) {
      setPending(false);
      const key = `errors.${result.error}`;
      setError(t.has(key) ? t(key) : t('errors.generic'));
      return;
    }
    router.push(detailHref);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="repertoire-name" className="block text-sm font-medium text-foreground">
          {t('nameLabel')}
        </label>
        <TextInput
          id="repertoire-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={REPERTOIRE_NAME_MAX}
          className="mt-1 w-full"
        />
      </div>

      {canLinkOpenings && (
        <OpeningLinksField openings={openings} selectedIds={openingIds} onChange={setOpeningIds} />
      )}

      <FormErrorBanner message={error} />

      <div className="space-y-3">
        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          loading={pending}
          disabled={pending}
        >
          {pending ? t('saving') : t('save')}
        </Button>
        <button
          type="button"
          onClick={() => router.push(detailHref)}
          disabled={pending}
          className="block w-full text-center text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
        >
          {t('cancel')}
        </button>
      </div>
    </form>
  );
}
