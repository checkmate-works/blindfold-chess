'use client';

import { parseAsInteger, parseAsString, useQueryStates } from 'nuqs';

import { countryCodeToFlag } from '@/lib/countries';

type Props = {
  statusFilter: string;
  countryFilter: string;
  rankFilter: string;
  levelFilter: string;
  providerFilter: string;
  usernameFilter: string;
  rankNames: Record<string, string>;
  levelNames: Record<string, string>;
  providerNames: Record<string, string>;
  labels: {
    clearAll: string;
    active: string;
    banned: string;
    anonymous: string;
    deleted: string;
    usernameOrEmailLabel: string;
    levelLabel: string;
  };
};

const STATUS_LABEL_KEYS: Record<string, keyof Props['labels']> = {
  active: 'active',
  banned: 'banned',
  anonymous: 'anonymous',
  deleted: 'deleted',
};

export function ActiveFilters({
  statusFilter,
  countryFilter,
  rankFilter,
  levelFilter,
  providerFilter,
  usernameFilter,
  rankNames,
  levelNames,
  providerNames,
  labels,
}: Props) {
  const [, setParams] = useQueryStates({
    status: parseAsString.withDefault(''),
    country: parseAsString.withDefault(''),
    rank: parseAsString.withDefault(''),
    level: parseAsString.withDefault(''),
    provider: parseAsString.withDefault(''),
    username: parseAsString.withDefault(''),
    page: parseAsInteger.withDefault(1),
  });

  const hasAnyFilter =
    statusFilter || countryFilter || rankFilter || levelFilter || providerFilter || usernameFilter;
  if (!hasAnyFilter) return null;

  const clearOne = (key: 'status' | 'country' | 'rank' | 'level' | 'provider' | 'username') => {
    setParams({ [key]: null, page: null }, { history: 'push', shallow: false });
  };

  const clearAll = () => {
    setParams(
      {
        status: null,
        country: null,
        rank: null,
        level: null,
        provider: null,
        username: null,
        page: null,
      },
      { history: 'push', shallow: false }
    );
  };

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      {countryFilter && (
        <FilterBadge
          label={`${countryCodeToFlag(countryFilter)} ${countryFilter}`}
          onRemove={() => clearOne('country')}
        />
      )}

      {rankFilter && (
        <FilterBadge
          label={rankNames[rankFilter] ?? rankFilter}
          onRemove={() => clearOne('rank')}
        />
      )}

      {levelFilter && (
        <FilterBadge
          label={`${labels.levelLabel}: ${levelNames[levelFilter] ?? levelFilter}`}
          onRemove={() => clearOne('level')}
        />
      )}

      {providerFilter && (
        <FilterBadge
          label={providerNames[providerFilter] ?? providerFilter}
          onRemove={() => clearOne('provider')}
        />
      )}

      {statusFilter && (
        <FilterBadge
          label={labels[STATUS_LABEL_KEYS[statusFilter] ?? 'active'] ?? statusFilter}
          onRemove={() => clearOne('status')}
        />
      )}

      {usernameFilter && (
        <FilterBadge
          label={`${labels.usernameOrEmailLabel}: "${usernameFilter}"`}
          onRemove={() => clearOne('username')}
        />
      )}

      <button
        type="button"
        onClick={clearAll}
        className="text-sm text-muted-foreground hover:text-foreground transition-colors ml-1"
      >
        {labels.clearAll}
      </button>
    </div>
  );
}

function FilterBadge({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm bg-muted text-foreground border border-border">
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="ml-0.5 hover:text-destructive transition-colors"
        aria-label={`Remove ${label} filter`}
      >
        &times;
      </button>
    </span>
  );
}
