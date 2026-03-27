'use client';

import { useActionState, useMemo, useState } from 'react';

import { useTranslations } from 'next-intl';

import { Button } from '@/app/_components';

import type { ActionResult } from '@/lib/action-types';

import { saveAnswerAction } from '../_actions/saveAnswer';

type Opening = {
  slug: string;
  name: string;
  translatedName: string;
};

type Props = {
  locale: string;
  questionKey: string;
  openings: Opening[];
};

export function OpeningSelectForm({ locale, questionKey, openings }: Props) {
  const t = useTranslations('interview.detail');
  const [search, setSearch] = useState('');
  const [selectedSlug, setSelectedSlug] = useState('');

  const boundSave = saveAnswerAction.bind(null, questionKey, locale);
  const [state, formAction, isPending] = useActionState<ActionResult | null, FormData>(
    boundSave,
    null
  );

  const filteredOpenings = useMemo(() => {
    if (!search.trim()) return openings;
    const lower = search.toLowerCase();
    return openings.filter(
      (o) =>
        o.translatedName.toLowerCase().includes(lower) ||
        o.name.toLowerCase().includes(lower) ||
        o.slug.toLowerCase().includes(lower)
    );
  }, [openings, search]);

  const selectedOpening = openings.find((o) => o.slug === selectedSlug);

  const errorMessage =
    state && 'error' in state
      ? t.has(`errors.${state.error}`)
        ? t(
            `errors.${state.error}` as
              | 'errors.unauthorized'
              | 'errors.banned'
              | 'errors.invalidQuestionKey'
              | 'errors.invalidAnswerValue'
              | 'errors.alreadyAnswered'
              | 'errors.rateLimited'
              | 'errors.unknown'
          )
        : t('errors.unknown')
      : null;

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="answerValue" value={selectedSlug} />
      {errorMessage && (
        <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
          {errorMessage}
        </div>
      )}

      <div className="space-y-2">
        <label htmlFor="opening-search" className="block text-sm font-medium text-foreground">
          {t('selectOpening')}
        </label>

        <input
          id="opening-search"
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('searchPlaceholder')}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        />

        {selectedOpening && (
          <p className="text-sm text-foreground">
            <span className="font-medium">{selectedOpening.translatedName}</span>
          </p>
        )}

        <div className="max-h-60 overflow-y-auto rounded-md border border-border bg-background">
          {filteredOpenings.length === 0 ? (
            <p className="p-3 text-sm text-muted-foreground">&mdash;</p>
          ) : (
            <ul role="listbox" aria-label={t('selectOpening')}>
              {filteredOpenings.map((opening) => (
                <li key={opening.slug}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={selectedSlug === opening.slug}
                    onClick={() => setSelectedSlug(opening.slug)}
                    className={`w-full text-left px-3 py-2 text-sm transition-colors hover:bg-muted ${
                      selectedSlug === opening.slug
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-foreground'
                    }`}
                  >
                    {opening.translatedName}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <Button type="submit" variant="primary" disabled={!selectedSlug || isPending}>
        {isPending ? t('saving') : t('save')}
      </Button>
    </form>
  );
}
