import { type PositionKind, getPositionKindDetailPath } from './kind';
import type { PositionType } from './types';

/**
 * Resolve the detail-page path for a position, based on its `type`.
 *
 * Returns `null` when the type has no detail page (currently `'sequence'`).
 * Callers should render the card without a link in that case.
 *
 * The `default` branch uses a `never`-typed assignment so extending
 * `PositionType` in the future produces a compile error here — forcing a
 * conscious routing decision for every new type.
 */
export function getPositionDetailPath(type: PositionType, id: string): string | null {
  switch (type) {
    case 'memory':
    case 'puzzle':
      return getPositionKindDetailPath(type, id);
    case 'sequence':
      // No detail page implemented yet. Cards are rendered without a link.
      return null;
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}

/**
 * Resolve the edit-history page path for a position (memory / puzzle only —
 * `updatePositionEntry` is the only writer of `position_content_revisions`,
 * and `sequence` positions have no detail page to link the history from
 * either).
 */
export function getPositionHistoryPath(type: PositionKind, id: string): string {
  return `${getPositionKindDetailPath(type, id)}/history`;
}
