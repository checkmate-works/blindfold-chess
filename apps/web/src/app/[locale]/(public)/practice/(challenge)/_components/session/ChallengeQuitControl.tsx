'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { QuitConfirmModal } from '@/app/[locale]/(public)/practice/_components/QuitConfirmModal';
import { useQuitConfirmLabels } from '@/app/[locale]/(public)/practice/_hooks/use-quit-confirm-labels';
import { TEXT_LINK_MUTED_CLASSES } from '@/app/[locale]/_lib/link-classes';

type Props = {
  onQuitRequest: () => void;
  showQuitModal: boolean;
  onQuitConfirm: () => void;
  onQuitCancel: () => void;
  /** Layout classes for the wrapper — modules differ in vertical rhythm. */
  className?: string;
};

/**
 * The "Quit" link that ends a challenge session, plus the confirmation modal
 * it opens. Bundled together because neither is ever used without the other,
 * and because the labels hook every call site had to remember belongs here.
 *
 * The link uses {@link TEXT_LINK_MUTED_CLASSES}, the project's canonical
 * auxiliary-link treatment (persistent underline + focus-visible ring — see
 * that module's TSDoc for why hover-only affordance is not acceptable).
 * Board-symmetry and route-planner already styled it this way; the other five
 * challenge sessions had an ad-hoc `text-muted-foreground hover:text-foreground
 * transition-colors` with no underline and no focus ring, and are normalised
 * onto the canonical treatment here.
 */
export function ChallengeQuitControl({
  onQuitRequest,
  showQuitModal,
  onQuitConfirm,
  onQuitCancel,
  className,
}: Props) {
  const tPractice = useTranslations('practice');
  const quitConfirmLabels = useQuitConfirmLabels();

  return (
    <>
      <div className={className}>
        <button onClick={onQuitRequest} className={`text-sm ${TEXT_LINK_MUTED_CLASSES}`}>
          {tPractice('quit')}
        </button>
      </div>

      <QuitConfirmModal
        isOpen={showQuitModal}
        onConfirm={onQuitConfirm}
        onCancel={onQuitCancel}
        labels={quitConfirmLabels}
      />
    </>
  );
}
