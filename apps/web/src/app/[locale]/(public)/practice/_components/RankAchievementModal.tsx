'use client';

import { useEffect, useId, useState } from 'react';

import Link from 'next/link';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { BELT_COLOR_HEX } from '@/lib/db/data/ranks';
import type { GrantedRank } from '@/lib/db/data/ranks';

import { Modal } from '@/app/[locale]/_components/Modal';

type Props = {
  locale: string;
};

export function RankAchievementModal({ locale }: Props) {
  const [grantedRanks, setGrantedRanks] = useState<GrantedRank[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const t = useTranslations('rankAchievement');
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    const stored = sessionStorage.getItem('blindfold_chess_granted_ranks');
    if (stored) {
      sessionStorage.removeItem('blindfold_chess_granted_ranks');
      try {
        const parsed = JSON.parse(stored) as GrantedRank[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setGrantedRanks(parsed);
          setIsOpen(true);
        }
      } catch {
        // Invalid JSON — ignore
      }
    }
  }, []);

  if (!isOpen || grantedRanks.length === 0) return null;

  const rank = grantedRanks[0]; // Show the first (most significant) rank
  const beltColor = BELT_COLOR_HEX[rank.color ?? ''] ?? '#6b7280';

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      maxWidth="max-w-sm"
      aria-labelledby={titleId}
      aria-describedby={descId}
    >
      <div className="p-6 text-center">
        {/* Celebration emoji/icon */}
        <div className="text-4xl">🎉</div>

        {/* Title */}
        <h2 id={titleId} className="mt-3 text-xl font-bold text-foreground">
          {t('title')}
        </h2>

        {/* Belt color bar */}
        <div
          className="mx-auto mt-4 h-3 w-32 rounded-full"
          style={{ backgroundColor: beltColor }}
        />

        {/* Rank name */}
        <p className="mt-3 text-2xl font-bold text-foreground">{t(`rankNames.${rank.slug}`)}</p>

        {/* Description */}
        <p id={descId} className="mt-2 text-sm text-muted-foreground">
          {t('description')}
        </p>

        {/* CTA: Link to ranks page */}
        <div className="mt-6 flex flex-col gap-3">
          <Link
            href={`/${locale}/ranks`}
            className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t('viewRanks')}
          </Link>
          <button
            onClick={() => setIsOpen(false)}
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            {t('close')}
          </button>
        </div>
      </div>
    </Modal>
  );
}
