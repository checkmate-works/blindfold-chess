import { notFound } from 'next/navigation';

import {
  POSITION_KIND_CONFIG,
  type PositionKind,
  getPositionKindDetailPath,
  getPositionListPath,
} from './kind';
import { getPositionWithProfileById } from './queries';

/**
 * Load the position a secondary view hangs off, and the three routing / i18n
 * values every one of them derives from its kind.
 *
 * The suggestion list, the suggestion form and the revision history each open
 * with the same five lines: fetch by id and kind, `notFound()` on a miss,
 * then re-derive the namespace, the list path and the detail path. Two of
 * those views also spelled the detail path out as a template literal rather
 * than calling `getPositionKindDetailPath`, so a change to the URL shape
 * would have reached them only by hand.
 *
 * Each view still runs its own `Promise.all` for the translators and data it
 * alone needs, so this does not add a round of awaiting to any of them.
 */
export async function resolvePositionViewContext(positionId: string, positionType: PositionKind) {
  const row = await getPositionWithProfileById({ id: positionId, type: positionType });
  if (!row) {
    notFound();
  }
  const { position } = row;

  return {
    position,
    namespace: POSITION_KIND_CONFIG[positionType].namespace,
    listPath: getPositionListPath(positionType),
    detailPath: getPositionKindDetailPath(positionType, position.id),
  };
}
