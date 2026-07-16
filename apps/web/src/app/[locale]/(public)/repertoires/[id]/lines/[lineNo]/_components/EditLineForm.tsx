'use client';

import { useState } from 'react';

import { useTranslations } from 'next-intl';

import { Button, FormErrorBanner, TextInput, Textarea } from '@/app/_components';
import { useRouter } from '@/i18n/routing';

import { KNOWN_LINE_FORM_ERRORS } from '@/lib/repertoires/line-form-errors';

import { updateLine } from '../_actions/updateLine';

type Props = {
  locale: string;
  repertoireId: string;
  lineNo: number;
  initialName: string;
  initialPgn: string;
};

/**
 * Owner-only editor for a single line: its title and its moves (a plain PGN
 * textbox). On save we just store the new moves — annotations and per-move
 * comments are position-keyed, so they follow the surviving positions with no
 * migration here.
 */
export function EditLineForm({ locale, repertoireId, lineNo, initialName, initialPgn }: Props) {
  const t = useTranslations('Repertoires.line.edit');
  const router = useRouter();

  const [name, setName] = useState(initialName);
  const [pgn, setPgn] = useState(initialPgn);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lineHref = `/repertoires/${repertoireId}/lines/${lineNo}`;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const result = await updateLine({
      repertoireId,
      lineNo,
      locale,
      name: name.trim() || null,
      pgn,
    });
    if (!result.ok) {
      setPending(false);
      setError(
        KNOWN_LINE_FORM_ERRORS.has(result.error) ? t(`errors.${result.error}`) : t('errors.generic')
      );
      return;
    }
    router.push(`${lineHref}?toast=line_updated`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="line-name" className="block text-sm font-medium text-foreground">
          {t('nameLabel')}
        </label>
        <TextInput
          id="line-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('namePlaceholder')}
          maxLength={120}
          className="mt-1 w-full"
        />
      </div>

      <div>
        <label htmlFor="line-pgn" className="block text-sm font-medium text-foreground">
          {t('pgnLabel')}
        </label>
        <p className="mt-1 text-xs text-muted-foreground">{t('pgnHelp')}</p>
        <Textarea
          id="line-pgn"
          value={pgn}
          onChange={(e) => setPgn(e.target.value)}
          rows={8}
          className="mt-1 font-mono text-sm"
        />
      </div>

      <FormErrorBanner message={error} />

      <div className="space-y-2">
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
          onClick={() => router.push(lineHref)}
          disabled={pending}
          className="block w-full text-center text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
        >
          {t('cancel')}
        </button>
      </div>
    </form>
  );
}
