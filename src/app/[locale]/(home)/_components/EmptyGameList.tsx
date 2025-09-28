'use client';

import { useTranslations } from 'next-intl';

export function EmptyGameList() {
  const t = useTranslations('home.gameList');

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      <div className="p-8 sm:p-12">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
            <span className="text-2xl">♔</span>
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">{t('noGames')}</h3>
        </div>
      </div>
    </div>
  );
}
