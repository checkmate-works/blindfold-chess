'use client';

import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';

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
        return (
          <button
            key={m}
            role="radio"
            aria-checked={isActive}
            onClick={() => handleModuleChange(m)}
            className={`flex-1 rounded-md px-4 py-2 text-center text-sm font-medium transition-colors ${
              isActive
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t(`moduleFilter.${m}`)}
          </button>
        );
      })}
    </div>
  );
}
