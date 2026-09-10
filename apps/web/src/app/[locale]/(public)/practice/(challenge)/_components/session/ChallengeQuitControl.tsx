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
 *
 * It sits 24px (`mt-6`) under the score counter — the distance
 * `TrainingFooter` puts between the score and "end training", so the two
 * modes read the same. The wrapper used to take a `className` from each
 * module, and the seven challenge screens ended up 24, 35, 51 and 59px below
 * their score on a phone. The margin was not the variable: the score lives
 * inside `ChallengeSessionVeil` and this link must stay outside it (see the
 * veil's `@design` note), so whatever bottom padding a module gave its veil
 * stacked under the margin. The fix is in two halves that only work
 * together: the margin is fixed here, and every veil carries top and side
 * padding only (`px-8 pt-8`, never `p-8`), so the score is the last thing
 * inside the curtain and this link is exactly `mt-6` under it. The
 * `*PlaySkeleton`s draw the same two blocks with the same margins
 * (`PlayQuitLinkSkeleton`), so nothing moves when the screen replaces them.
 */
export function ChallengeQuitControl({
  onQuitRequest,
  showQuitModal,
  onQuitConfirm,
  onQuitCancel,
}: Props) {
  const tPractice = useTranslations('practice');
  const quitConfirmLabels = useQuitConfirmLabels();

  return (
    <>
      <div className="mt-6 text-center">
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
