'use client';

import { useTranslations } from 'next-intl';

import type { ChunkOption } from '@/lib/chunks/types';
import type { ThemeOption } from '@/lib/themes/types';

import { RelatedTagCard } from '@/app/[locale]/_components/RelatedTags';

type Props = {
  themes: ThemeOption[];
  chunks: ChunkOption[];
};

/**
 * Read-only card list of the themes and chunks attached to a draft, shown on
 * the create/edit preview steps so the author can confirm the tags that will
 * ride along with the save. Reuses the detail page's `RelatedTagCard` for a
 * consistent look, but renders the cards static (non-navigable) since a click
 * mid-author would trip the unsaved-changes guard. Themes lead, chunks follow
 * — mirroring `RelatedTags`. Renders nothing when no tags are attached.
 */
export function PreviewTags({ themes, chunks }: Props) {
  const t = useTranslations('practice.tags');

  if (themes.length + chunks.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-foreground">{t('section')}</p>
      <div className="space-y-3">
        {themes.map((theme) => (
          <RelatedTagCard
            key={`theme-${theme.id}`}
            kind="theme"
            previewFen={theme.previewFen}
            label={theme.label}
            description={theme.definition}
            badgeText={t('badge.theme')}
          />
        ))}
        {chunks.map((chunk) => (
          <RelatedTagCard
            key={`chunk-${chunk.id}`}
            kind="chunk"
            previewFen={chunk.representativeFen}
            label={chunk.label}
            description={chunk.description}
            badgeText={t('badge.chunk')}
          />
        ))}
      </div>
    </div>
  );
}
