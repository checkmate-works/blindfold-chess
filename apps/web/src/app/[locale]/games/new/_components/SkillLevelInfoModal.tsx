'use client';

import { useTranslations } from 'next-intl';

import { Modal } from '@/app/[locale]/_components/Modal';

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export function SkillLevelInfoModal({ isOpen, onClose }: Props) {
  const t = useTranslations('newGame.skillLevelInfo');

  return (
    <Modal isOpen={isOpen} title={t('title')} onClose={onClose} maxWidth="max-w-2xl">
      <div className="space-y-4">
        {/* Overview */}
        <div>
          <p className="text-foreground">{t('overview')}</p>
        </div>

        {/* ELO Calculation */}
        <div>
          <h3 className="font-semibold text-foreground mb-2">{t('eloCalculationTitle')}</h3>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>{t('eloCalculationDescription')}</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>
                {t('eloLevels1to14')}: {t('eloFormula1to14')}
              </li>
              <li>
                {t('eloLevels15to20')}: {t('eloFormula15to20')}
              </li>
            </ul>
          </div>
        </div>

        {/* Examples */}
        <div>
          <h3 className="font-semibold text-foreground mb-2">{t('examplesTitle')}</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="bg-muted/50 p-2 rounded">
              <span className="font-medium text-foreground">Level 1:</span>
              <span className="text-muted-foreground ml-2">800 ELO</span>
            </div>
            <div className="bg-muted/50 p-2 rounded">
              <span className="font-medium text-foreground">Level 5:</span>
              <span className="text-muted-foreground ml-2">1200 ELO</span>
            </div>
            <div className="bg-muted/50 p-2 rounded">
              <span className="font-medium text-foreground">Level 10:</span>
              <span className="text-muted-foreground ml-2">1700 ELO</span>
            </div>
            <div className="bg-muted/50 p-2 rounded">
              <span className="font-medium text-foreground">Level 15:</span>
              <span className="text-muted-foreground ml-2">2500 ELO</span>
            </div>
            <div className="bg-muted/50 p-2 rounded">
              <span className="font-medium text-foreground">Level 20:</span>
              <span className="text-muted-foreground ml-2">3200 ELO</span>
            </div>
          </div>
        </div>

        {/* Note */}
        <div className="bg-muted/30 p-3 rounded text-sm text-muted-foreground">
          <p>{t('note')}</p>
        </div>
      </div>
    </Modal>
  );
}
