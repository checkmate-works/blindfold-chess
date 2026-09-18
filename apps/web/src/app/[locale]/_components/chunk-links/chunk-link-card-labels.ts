import type { InterpolatingTranslator } from '@/i18n/translator';

import type { ChunkLinkCardLabels } from './ChunkLinkCard';

/**
 * The `labels` bundle {@link ChunkLinkCard} takes, read out of a namespace
 * holding the card's copy.
 *
 * The card is generic over its copy because the shared-game thread and the
 * kata line section each keep theirs under their own feature namespace
 * (`sharedGames.chunks.*`, `Repertoires.chunks.*`). The key names inside that
 * namespace are the card's, though, not the feature's — so all three call
 * sites listed the same seven of them, and a label added to the card would
 * have had to be added again in each. `tCard` is a translator already scoped
 * to the feature's `chunks` namespace; only `deletedUser` comes from `Common`.
 */
export function buildChunkLinkCardLabels(
  tCard: InterpolatingTranslator,
  tCommon: InterpolatingTranslator
): ChunkLinkCardLabels {
  return {
    linkedAction: (count: number) => tCard('linkedAction', { count }),
    remove: (title: string) => tCard('remove', { title }),
    delete: tCard('delete'),
    confirmUnlinkTitle: tCard('confirmUnlinkTitle'),
    confirmUnlinkBody: tCard('confirmUnlinkBody'),
    confirmCancel: tCard('confirmCancel'),
    deletedUser: tCommon('deletedUser'),
  };
}
