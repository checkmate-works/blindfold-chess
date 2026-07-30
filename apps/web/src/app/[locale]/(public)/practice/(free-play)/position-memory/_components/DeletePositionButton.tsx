'use client';

import { DeletePositionEntryButton } from '@/app/[locale]/(public)/practice/(free-play)/_components/DeletePositionEntryButton';

import { deletePosition } from '../_actions/deletePosition';

type Props = {
  positionId: string;
  locale: string;
};

/**
 * Owner-side delete entry for the position-memory detail page's "⋯" overflow
 * menu — {@link DeletePositionEntryButton} wired to `deletePosition`.
 */
export function DeletePositionButton({ positionId, locale }: Props) {
  return (
    <DeletePositionEntryButton
      namespace="practice.positionMemory.delete"
      onDelete={() => deletePosition(positionId, locale)}
      redirectPath={`/${locale}/practice/position-memory?toast=position_deleted`}
    />
  );
}
