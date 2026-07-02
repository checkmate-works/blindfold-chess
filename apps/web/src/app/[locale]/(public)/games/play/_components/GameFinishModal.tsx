'use client';

import { useId } from 'react';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FaBook, FaChartLine, FaChessBoard } from 'react-icons/fa';

import { CloseButton } from '@/app/[locale]/_components/CloseButton';
import { type HelpStep, HelpTourButton } from '@/app/[locale]/_components/HelpTourButton';
import { Modal } from '@/app/[locale]/_components/Modal';

import { FinishChoiceCard } from './FinishChoiceCard';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  /** Go to the result screen (stats / share / review). */
  onResult: () => void;
  /** Open the postmortem ("Game Review") — auth-guarded by the caller. */
  onGameReview: () => void;
};

/**
 * Shown when a game ends in live play, in place of the old auto-redirect to the
 * result screen. Offers three next steps as cards — Result, Game Review
 * (postmortem), and Kata (repertoire opening check, coming soon) — each with a
 * help-tour explanation. Dismissing it leaves the player on the finished board.
 */
export function GameFinishModal({ isOpen, onClose, onResult, onGameReview }: Props) {
  const t = useTranslations('play');
  const titleId = useId();

  const tourSteps: HelpStep[] = [
    {
      targetId: 'finish-card-result',
      title: t('finishModal.result.title'),
      description: t('finishModal.result.description'),
    },
    {
      targetId: 'finish-card-review',
      title: t('finishModal.review.title'),
      description: t('finishModal.review.description'),
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

        <div className="flex items-center justify-center gap-2 pr-8">
          <h2 id={titleId} className="text-xl font-bold text-foreground">
            {t('finishModal.title')}
          </h2>
          <HelpTourButton steps={tourSteps} label={t('finishModal.help')} />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <FinishChoiceCard
            tourId="finish-card-result"
            icon={<FaChartLine aria-hidden />}
            title={t('finishModal.result.title')}
            description={t('finishModal.result.description')}
            onClick={onResult}
          />
          <FinishChoiceCard
            tourId="finish-card-review"
            icon={<FaChessBoard aria-hidden />}
            title={t('finishModal.review.title')}
            description={t('finishModal.review.description')}
            onClick={onGameReview}
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
