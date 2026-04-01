'use client';

import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';

import { PRACTICE_EMOJIS } from '@/app/[locale]/(public)/practice/_lib/practice-emojis';

import type { ModuleFilterValue } from '../_lib/types';
import { VALID_MODULE_FILTERS } from '../_lib/types';

type Props = {
  currentModule: ModuleFilterValue;
};

export function ModuleFilter({ currentModule }: Props) {
  const t = useTranslations('leaderboard');
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleModuleChange(module: ModuleFilterValue) {
    const params = new URLSearchParams(searchParams.toString());
    if (module === 'all') {
      params.delete('module');
    } else {
      params.set('module', module);
    }
    router.push(`?${params.toString()}`);
  }

  return (
    <div
      className="flex rounded-lg bg-secondary p-1"
      role="radiogroup"
      aria-label={t('moduleFilterLabel')}
    >
      {VALID_MODULE_FILTERS.map((m) => {
        const isActive = currentModule === m;
        const emoji = m === 'all' ? null : PRACTICE_EMOJIS[m];
        return (
          <button
            key={m}
            role="radio"
            aria-checked={isActive}
            onClick={() => handleModuleChange(m)}
            title={t(`moduleFilter.${m}`)}
            className={`flex-1 rounded-md px-2 py-2 text-center text-sm font-medium transition-colors md:px-4 ${
              isActive
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {emoji ? (
              <>
                <span>{emoji}</span>
                <span className="hidden md:inline"> {t(`moduleFilter.${m}`)}</span>
              </>
            ) : (
              t(`moduleFilter.${m}`)
            )}
          </button>
        );
      })}
    </div>
  );
}
