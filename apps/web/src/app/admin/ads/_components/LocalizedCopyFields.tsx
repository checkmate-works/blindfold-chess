'use client';

import { Field, Input, Textarea } from '@/app/admin/_components/forms';
import { SUPPORTED_LOCALES } from '@/config';
import { LOCALE_LABELS } from '@/i18n/locale-labels';

import type { Locale } from '@/app/[locale]/_lib/types';

import type { AdCreativeFormLabels } from '../_lib/form-labels';
import { AD_CREATIVE_LIMITS } from '../_lib/validation';

type Props = {
  labels: AdCreativeFormLabels;
  title: Record<Locale, string>;
  onTitleChange: (locale: Locale, value: string) => void;
  description: Record<Locale, string>;
  onDescriptionChange: (locale: Locale, value: string) => void;
};

/**
 * One title and one description input per supported locale.
 *
 * Only `en` is required: it is what every locale the admin leaves blank
 * falls back to at render time (`resolveNativeCopy`), so a half-translated
 * creative still renders a whole card in every language.
 */
export function LocalizedCopyFields({
  labels,
  title,
  onTitleChange,
  description,
  onDescriptionChange,
}: Props) {
  return (
    <>
      {SUPPORTED_LOCALES.map((locale) => (
        <Field
          key={`title-${locale}`}
          label={`${labels.title} (${LOCALE_LABELS[locale]})`}
          htmlFor={`title-${locale}`}
          description={locale === 'en' ? labels.cardCopyHint : undefined}
        >
          <Input
            id={`title-${locale}`}
            type="text"
            value={title[locale]}
            onChange={(e) => onTitleChange(locale, e.target.value)}
            required={locale === 'en'}
            maxLength={AD_CREATIVE_LIMITS.text}
          />
        </Field>
      ))}
      {SUPPORTED_LOCALES.map((locale) => (
        <Field
          key={`description-${locale}`}
          label={`${labels.description} (${LOCALE_LABELS[locale]})`}
          htmlFor={`description-${locale}`}
        >
          <Textarea
            id={`description-${locale}`}
            rows={2}
            value={description[locale]}
            onChange={(e) => onDescriptionChange(locale, e.target.value)}
            required={locale === 'en'}
            maxLength={AD_CREATIVE_LIMITS.text}
          />
        </Field>
      ))}
    </>
  );
}
