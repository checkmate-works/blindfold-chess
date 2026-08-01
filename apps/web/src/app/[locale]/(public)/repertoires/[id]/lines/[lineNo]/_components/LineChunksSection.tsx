'use client';

import { Button } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FaBrain } from 'react-icons/fa';

import { groupChunkLinksBySuggester } from '@/lib/chunks/group-chunk-links';
import type { ChunkOption } from '@/lib/chunks/types';
import type { RepertoireChunkItem } from '@/lib/db/repertoire-chunks';

import { JoinConversationToggle } from '@/app/[locale]/(public)/topics/_components/JoinConversationToggle';
import { SectionTitle } from '@/app/[locale]/_components';
import { ChunkLinkCard } from '@/app/[locale]/_components/chunk-links/ChunkLinkCard';
import { ChunkPicker } from '@/app/[locale]/_components/chunk-links/ChunkPicker';
import { StagedChunkCard } from '@/app/[locale]/_components/chunk-links/StagedChunkCard';
import type { Locale } from '@/app/[locale]/_lib/types';

import type { LineChunksUser } from '../_hooks/use-repertoire-chunk-links';
import { useRepertoireChunkLinks } from '../_hooks/use-repertoire-chunk-links';

type Props = {
  repertoireId: string;
  lineNo: number;
  /** 1-based half-move currently in focus (the page's `initialPly`). */
  ply: number;
  /** This position's chunk links only (the page groups `listRepertoireChunks`
   * by `positionKey` and picks the current position's bucket). */
  items: RepertoireChunkItem[];
  /** Chunks selectable in the picker: the published catalog plus the
   * viewer's own drafts (`getLinkableChunkOptionsForViewer`). */
  availableChunks: ChunkOption[];
  currentUser: LineChunksUser | null;
  /** Whether the viewer owns the repertoire (may remove any link). */
  isOwner: boolean;
  locale: Locale;
};

/**
 * Applicable-chunk links for the position on the board — a sibling section to
 * `MoveCommentsSection`, mirroring `sharedGames`'s per-move chunk section
 * (picker + staged list + posted links). See `useRepertoireChunkLinks` for
 * why there is no ply-filtering/reset-on-navigate logic here: the caller
 * passes only the current position's links and keys this component on
 * `positionKey`, so moving to a different position remounts it instead.
 */
export function LineChunksSection({
  repertoireId,
  lineNo,
  ply,
  items,
  availableChunks,
  currentUser,
  isOwner,
  locale,
}: Props) {
  const t = useTranslations('Repertoires.chunks');
  const tCommon = useTranslations('Common');
  const links = useRepertoireChunkLinks({
    repertoireId,
    lineNo,
    ply,
    items,
    currentUser,
    isOwner,
  });

  return (
    <section className="space-y-4">
      <SectionTitle>{t('title')}</SectionTitle>

      <JoinConversationToggle
        count={links.items.length}
        joinLabel={t('suggest')}
        icon={<FaBrain aria-hidden="true" className="text-muted-foreground" />}
      >
        <div className="space-y-3">
          <ChunkPicker
            availableChunks={availableChunks}
            linkedChunkIds={links.excludedChunkIds}
            disabled={links.submitting}
            onSelect={links.stage}
            labels={{
              placeholder: t('placeholder'),
              noResults: t('noResults'),
              moreItemsHint: (count: number) => t('moreItemsHint', { count }),
              draft: t('draftBadge'),
            }}
          />

          {links.staged.length > 0 && (
            <>
              <ul className="space-y-2">
                {links.staged.map((c) => (
                  <StagedChunkCard
                    key={c.id}
                    slug={c.slug}
                    title={c.label}
                    description={c.description}
                    representativeFen={c.representativeFen}
                    badge={c.status === 'draft' ? t('draftBadge') : t('badge')}
                    locale={locale}
                    onRemove={() => links.unstage(c.id)}
                    removeLabel={t('remove', { title: c.label })}
                  />
                ))}
              </ul>
              {links.error && <p className="text-sm text-destructive">{links.error}</p>}
              <Button
                variant="primary"
                fullWidth
                onClick={links.handleSubmit}
                disabled={links.submitting}
                loading={links.submitting}
              >
                {links.submitting ? t('submitting') : t('submit', { count: links.staged.length })}
              </Button>
            </>
          )}
          {links.staged.length === 0 && links.error && (
            <p className="text-sm text-destructive">{links.error}</p>
          )}
        </div>
      </JoinConversationToggle>

      {links.items.length > 0 ? (
        <ul className="space-y-6">
          {groupChunkLinksBySuggester(links.items).map((group) => (
            <ChunkLinkCard
              key={group[0].id}
              items={group}
              badge={t('badge')}
              draftBadge={t('draftBadge')}
              locale={locale}
              canRemove={links.canRemove}
              onRemove={(item) => links.handleRemoveSaved(item.id)}
              labels={{
                linkedAction: (count) => t('linkedAction', { count }),
                remove: (title) => t('remove', { title }),
                delete: t('delete'),
                confirmUnlinkTitle: t('confirmUnlinkTitle'),
                confirmUnlinkBody: t('confirmUnlinkBody'),
                confirmCancel: t('confirmCancel'),
                deletedUser: tCommon('deletedUser'),
              }}
            />
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground">{t('empty')}</p>
      )}
    </section>
  );
}
