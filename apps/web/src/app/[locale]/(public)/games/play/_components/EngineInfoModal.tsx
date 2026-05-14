'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import type { EngineConfig } from '@/lib/engines';

import { Modal } from '@/app/[locale]/_components/Modal';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  engineConfig: EngineConfig;
};

/**
 * Read-only modal that surfaces which engine + difficulty is driving
 * the current game. Mirrors the {@link OperationLogModal} pattern so
 * the two info affordances in the in-progress game footer share their
 * presentation.
 *
 * The body branches on `engineConfig.kind` so each engine can carry
 * its own descriptor — Stockfish exposes the 1..20 skill level, Maia
 * exposes the catalog Elo. Adding a new engine means appending one
 * variant to {@link EngineConfig} and one row group here.
 */
export function EngineInfoModal({ isOpen, onClose, engineConfig }: Props) {
  const t = useTranslations('play');

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('engineInfo.title')} maxWidth="max-w-sm">
      <dl className="divide-y divide-border text-sm">
        <div className="grid grid-cols-3 gap-2 py-2">
          <dt className="text-muted-foreground">{t('engineInfo.engineLabel')}</dt>
          <dd className="col-span-2 font-medium">
            {engineConfig.kind === 'maia' ? 'Maia' : 'Stockfish'}
          </dd>
        </div>
        <div className="grid grid-cols-3 gap-2 py-2">
          <dt className="text-muted-foreground">{t('engineInfo.difficultyLabel')}</dt>
          <dd className="col-span-2 font-medium">
            {engineConfig.kind === 'maia'
              ? t('engineInfo.maiaDifficulty', { rating: engineConfig.rating })
              : t('engineInfo.stockfishDifficulty', { level: engineConfig.skillLevel })}
          </dd>
        </div>
      </dl>
    </Modal>
  );
}
