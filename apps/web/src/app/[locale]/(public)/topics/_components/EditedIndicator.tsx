'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { formatAbsoluteDateTime } from '../_lib/absolute-time';

type Props = {
  updatedAt: Date;
  locale: string;
};

/**
 * Small "(edited)" label that sits next to a comment's creation timestamp
 * whenever the post's `updated_at` has advanced past `created_at`. The
 * absolute edit time goes into the `title` attribute and is also exposed
 * via an `<abbr>`, so a hover / focus reveals when the edit happened
 * without consuming visual space in the comment header.
 */
export function EditedIndicator({ updatedAt, locale }: Props) {
  const t = useTranslations('topics.edit');
  const formatted = formatAbsoluteDateTime(updatedAt, locale, 'short');
  return (
    <abbr title={t('editedTitle', { date: formatted })} className="italic no-underline">
      {t('editedLabel')}
    </abbr>
  );
}
