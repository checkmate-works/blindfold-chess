'use client';

import { useTranslations } from 'next-intl';

import type { LeaderboardModule, LeaderboardPeriod } from '../_lib/types';
import { MODULES, MODULE_KEYS, VALID_PERIODS } from '../_lib/types';

type Props = {
  period: LeaderboardPeriod;
  module: LeaderboardModule;
  settingKey: string;
  onPeriodChange: (period: LeaderboardPeriod) => void;
  onModuleChange: (module: LeaderboardModule) => void;
  onSettingKeyChange: (key: string) => void;
};

export function LeaderboardFilters({
  period,
  module,
  settingKey,
  onPeriodChange,
  onModuleChange,
  onSettingKeyChange,
}: Props) {
  const t = useTranslations('leaderboard');

  const settingKeys = MODULE_KEYS[module];

  return (
    <div className="space-y-4">
      {/* Period Toggle */}
      <div
        className="flex rounded-lg bg-secondary p-1"
        role="radiogroup"
        aria-label={t('periodLabel')}
      >
        {VALID_PERIODS.map((p) => (
          <button
            key={p}
            role="radio"
            aria-checked={period === p}
            onClick={() => onPeriodChange(p)}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              period === p
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t(`period.${p}`)}
          </button>
        ))}
      </div>

      {/* Module Tabs */}
      <div className="flex gap-1 overflow-x-auto" role="tablist" aria-label={t('moduleLabel')}>
        {MODULES.map((m) => (
          <button
            key={m}
            role="tab"
            aria-selected={module === m}
            onClick={() => onModuleChange(m)}
            className={`whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              module === m
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            }`}
          >
            {t(`module.${m}`)}
          </button>
        ))}
      </div>

      {/* Setting Key Selector - hide when only one option */}
      {settingKeys.length > 1 && (
        <div
          className="flex rounded-lg bg-secondary p-1"
          role="radiogroup"
          aria-label={t('settingLabel')}
        >
          {settingKeys.map((k) => (
            <button
              key={k}
              role="radio"
              aria-checked={settingKey === k}
              onClick={() => onSettingKeyChange(k)}
              className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                settingKey === k
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t(`setting.${module}.${k}`)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
