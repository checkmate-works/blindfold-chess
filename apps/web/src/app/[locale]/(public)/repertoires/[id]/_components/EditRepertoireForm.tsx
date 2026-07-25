'use client';

import { useState } from 'react';

import { useTranslations } from 'next-intl';

import { useUnsavedChanges } from '@/_hooks/useUnsavedChanges';
import { Button, FormErrorBanner, TextInput, Textarea } from '@/app/_components';
import { UnsavedChangesDialog } from '@/app/_components/UnsavedChangesDialog';
import { useRouter } from '@/i18n/routing';
import { flushSync } from 'react-dom';

import type { OpeningOption } from '@/lib/repertoires/opening-queries';
import type { RepertoireSide } from '@/lib/repertoires/validation';
import { REPERTOIRE_DESCRIPTION_MAX, REPERTOIRE_NAME_MAX } from '@/lib/repertoires/validation';

import { OpeningLinksField } from '../../_components/OpeningLinksField';
import { updateRepertoire } from '../_actions/updateRepertoire';

type Props = {
  locale: string;
  repertoireId: string;
  initialName: string;
  /** The course-level description blurb (empty string when unset). */
  initialDescription: string;
  /** The opening master; empty for a non-opening repertoire (picker hidden). */
  openings: OpeningOption[];
  initialOpeningIds: string[];
  /** Opening links only exist for an `opening`-phase repertoire. */
  canLinkOpenings: boolean;
  /** The repertoire's side — plain metadata, editable like the title. */
  side: RepertoireSide;
};

/**
 * Owner-only editor for a repertoire's METADATA: its title, description, side,
 * and opening links. The move tree is deliberately NOT edited here — lines are
 * authored one at a time on each line's own page (edit / delete / branch), so a
 * whole-kata edit can't silently lose a line's identity or orphan its notes the
 * way a diff-the-whole-PGN save did. Phase stays fixed (it gates whether
 * opening links apply, and only `opening` is authorable anywhere today); side
 * is pure metadata (see `updateRepertoireDetails`) and doesn't constrain the
 * PGN, so relabeling it can't desync anything.
 */
export function EditRepertoireForm({
  locale,
  repertoireId,
  initialName,
  initialDescription,
  openings,
  initialOpeningIds,
  canLinkOpenings,
  side: initialSide,
}: Props) {
  const t = useTranslations('Repertoires.edit');
  const tForm = useTranslations('Repertoires.form');
  const router = useRouter();

  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [side, setSide] = useState<RepertoireSide>(initialSide);
  const [openingIds, setOpeningIds] = useState<string[]>(initialOpeningIds);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // Same leave-guard pieces as the import / line edit / chunk forms.
  const tUnsaved = useTranslations('unsavedChanges');
  const isDirty =
    !submitted &&
    (name !== initialName ||
      description !== initialDescription ||
      side !== initialSide ||
      JSON.stringify([...openingIds].sort()) !== JSON.stringify([...initialOpeningIds].sort()));
  const { isBlocking, confirm, cancel } = useUnsavedChanges({ isDirty });

  const detailHref = `/repertoires/${repertoireId}`;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const result = await updateRepertoire({
      repertoireId,
      locale,
      name,
      description,
      side,
      openingIds: canLinkOpenings ? openingIds : [],
    });
    if (!result.ok) {
      setPending(false);
      const key = `errors.${result.error}`;
      setError(t.has(key) ? t(key) : t('errors.generic'));
      return;
    }

    // flushSync so the isDirty -> false re-render completes before
    // router.push triggers the navigation guard (same as ChunkForm).
    flushSync(() => setSubmitted(true));
    router.push(detailHref);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="repertoire-name" className="block text-sm font-medium text-foreground">
          {t('nameLabel')} <span className="text-destructive">*</span>
        </label>
        <TextInput
          id="repertoire-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={REPERTOIRE_NAME_MAX}
          className="mt-1 w-full"
        />
      </div>

      <div>
        <label
          htmlFor="repertoire-description"
          className="block text-sm font-medium text-foreground"
        >
          {t('descriptionLabel')}
        </label>
        <Textarea
          id="repertoire-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          maxLength={REPERTOIRE_DESCRIPTION_MAX}
          placeholder={t('descriptionPlaceholder')}
          className="mt-1 w-full"
        />
      </div>

      <fieldset>
        <legend className="block text-sm font-medium text-foreground">{tForm('sideLabel')}</legend>
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
              {tForm(`side_${value}`)}
            </label>
          ))}
        </div>
      </fieldset>

      {canLinkOpenings && (
        <OpeningLinksField openings={openings} selectedIds={openingIds} onChange={setOpeningIds} />
      )}

      <FormErrorBanner message={error} />

      <UnsavedChangesDialog
        open={isBlocking}
        onConfirm={confirm}
        onCancel={cancel}
        title={tUnsaved('title')}
        message={tUnsaved('message')}
        confirmLabel={tUnsaved('confirm')}
        cancelLabel={tUnsaved('cancel')}
      />

      <div className="space-y-4">
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
