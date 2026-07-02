'use client';

import { useId } from 'react';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FaBook, FaBrain, FaClipboardList } from 'react-icons/fa';

import { CompactResultHeader } from '@/app/[locale]/(public)/games/play/result/_components/CompactResultHeader';
import { CloseButton } from '@/app/[locale]/_components/CloseButton';
import { type HelpStep, HelpTourButton } from '@/app/[locale]/_components/HelpTourButton';
import { Modal } from '@/app/[locale]/_components/Modal';

import { FinishChoiceCard } from './FinishChoiceCard';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  /** The player's terminal result, shown at the top of the modal. */
  result?: 'win' | 'loss' | 'draw' | null;
  /**
   * Go to the result screen — review the game, comment reflections, see stats.
   * Labelled "Game Review".
   */
  onReview: () => void;
  /**
   * Open the postmortem — reconstruct the whole game from memory. Labelled
   * "Recall". Auth-guarded by the caller.
   */
  onRecall: () => void;
};

/**
 * Shown when a game ends in live play, in place of the old auto-redirect to the
 * result screen. Leads with the win/loss/draw result, then offers three next
 * steps as cards — Game Review (result screen: stats + reflections), Recall
 * (postmortem memory reconstruction), and Kata (repertoire opening check,
 * coming soon) — each with a help-tour explanation. Dismissing it leaves the
 * player on the finished board (reopen via the board's "Next action" button).
 */
export function GameFinishModal({ isOpen, onClose, result, onReview, onRecall }: Props) {
  const t = useTranslations('play');
  const titleId = useId();

  const tourSteps: HelpStep[] = [
    {
      targetId: 'finish-card-review',
      title: t('finishModal.review.title'),
      description: t('finishModal.review.description'),
    },
    {
      targetId: 'finish-card-recall',
      title: t('finishModal.recall.title'),
      description: t('finishModal.recall.description'),
    },
    {
      targetId: 'finish-card-kata',
      title: t('finishModal.kata.title'),
      description: t('finishModal.kata.description'),
    },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-lg" aria-labelledby={titleId}>
      <div className="relative space-y-4">
        <CloseButton
          onClick={onClose}
          size="w-5 h-5"
          className="absolute top-0 right-0 text-muted-foreground hover:text-foreground transition-colors"
        />

        <div id={titleId} className="flex flex-col items-center gap-2 pr-8">
          {result && <CompactResultHeader result={result} />}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{t('finishModal.title')}</span>
            <HelpTourButton steps={tourSteps} label={t('finishModal.help')} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <FinishChoiceCard
            tourId="finish-card-review"
            icon={<FaClipboardList aria-hidden />}
            title={t('finishModal.review.title')}
            description={t('finishModal.review.description')}
            onClick={onReview}
          />
          <FinishChoiceCard
            tourId="finish-card-recall"
            icon={<FaBrain aria-hidden />}
            title={t('finishModal.recall.title')}
            description={t('finishModal.recall.description')}
            onClick={onRecall}
          />
          <FinishChoiceCard
            tourId="finish-card-kata"
            icon={<FaBook aria-hidden />}
            title={t('finishModal.kata.title')}
            description={t('finishModal.kata.description')}
            comingSoon
            comingSoonLabel={t('finishModal.comingSoon')}
          />
        </div>
      </div>
    </Modal>
  );
}
