'use client';

import { InfoModal } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FaCheck, FaStar } from 'react-icons/fa';

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export function EvaluationInfoModal({ isOpen, onClose }: Props) {
  const t = useTranslations('postmortem');

  return (
    <InfoModal isOpen={isOpen} onClose={onClose} title={t('evalInfoTitle')}>
      <div className="space-y-4">
        <div>
          <p className="mb-3">{t('evalInfoDescription')}</p>
          <ul className="list-disc pl-5 space-y-1 text-sm">
            <li>{t('evalInfoPoint1')}</li>
            <li>{t('evalInfoPoint2')}</li>
            <li>{t('evalInfoPoint3')}</li>
          </ul>
        </div>

        <div>
          <h3 className="font-semibold mb-2">{t('evalScoreMeaning')}</h3>
          <p className="text-sm text-muted-foreground">{t('evalScoreDescription')}</p>
        </div>

        <div>
          <h3 className="font-semibold mb-2">{t('evalCriteriaTitle')}</h3>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-500 flex-shrink-0">
                <FaStar className="w-2.5 h-2.5 text-white" />
              </span>
              <span>
                <strong>{t('evalBest')}</strong>: {t('evalBestCriteria')}
              </span>
            </li>
            <li className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-500 flex-shrink-0">
                <FaCheck className="w-2.5 h-2.5 text-white" />
              </span>
              <span>
                <strong>{t('evalGood')}</strong>: {t('evalGoodCriteria')}
              </span>
            </li>
            <li className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-yellow-500 text-white text-[10px] font-bold flex-shrink-0">
                ?!
              </span>
              <span>
                <strong>{t('evalInaccuracy')}</strong>: {t('evalInaccuracyCriteria')}
              </span>
            </li>
            <li className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-orange-500 text-white text-[10px] font-bold flex-shrink-0">
                ?
              </span>
              <span>
                <strong>{t('evalMistake')}</strong>: {t('evalMistakeCriteria')}
              </span>
            </li>
            <li className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex-shrink-0">
                ??
              </span>
              <span>
                <strong>{t('evalBlunder')}</strong>: {t('evalBlunderCriteria')}
              </span>
            </li>
          </ul>
        </div>
      </div>
    </InfoModal>
  );
}
