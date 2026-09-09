'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { MAX_DESCRIPTION_LENGTH, MAX_TITLE_LENGTH } from '@/lib/games/publish-constants';

type Props = {
  /** Prefix for the two input ids, so a page can host the form without clashes. */
  idPrefix: string;
  title: string;
  description: string;
  onTitleChange: (title: string) => void;
  onDescriptionChange: (description: string) => void;
};

/**
 * The title and description inputs of a shared game, as the publish form and
 * the owner's edit form both present them: labels and placeholders from the
 * `sharedGames.new` copy, `maxLength` from the publish limits.
 */
export function GameTitleDescriptionFields({
  idPrefix,
  title,
  description,
  onTitleChange,
  onDescriptionChange,
}: Props) {
  const t = useTranslations('sharedGames');
  const titleId = `${idPrefix}-title`;
  const descriptionId = `${idPrefix}-description`;

  return (
    <>
      <div className="space-y-1.5">
        <label htmlFor={titleId} className="block text-sm font-medium">
          {t('new.titleLabel')}
        </label>
        <input
          id={titleId}
          type="text"
          value={title}
          maxLength={MAX_TITLE_LENGTH}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder={t('new.titlePlaceholder')}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor={descriptionId} className="block text-sm font-medium">
          {t('new.descriptionLabel')}
        </label>
        <textarea
          id={descriptionId}
          value={description}
          maxLength={MAX_DESCRIPTION_LENGTH}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder={t('new.descriptionPlaceholder')}
          rows={4}
          className="w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>
    </>
  );
}
