import type { ServerTranslator } from '@/i18n/translator';

import type { ProviderNames } from '../_lib/provider-filter';
import { ProviderFilter } from './ProviderFilter';
import { StatusFilter } from './StatusFilter';

type UserFilterBarProps = {
  t: ServerTranslator;
  providerNames: ProviderNames;
};

/**
 * The status and signup-method filters shared by the users list and the user
 * stats page, which narrow their population by the same two URL params.
 */
export function UserFilterBar({ t, providerNames }: UserFilterBarProps) {
  return (
    <div className="mb-6 flex flex-wrap gap-4">
      <StatusFilter
        labels={{
          filterByStatus: t('usersTable.filterByStatus'),
          allStatuses: t('usersTable.allStatuses'),
          active: t('usersTable.active'),
          banned: t('usersTable.banned'),
          anonymous: t('usersTable.anonymous'),
          deleted: t('usersTable.deleted'),
        }}
      />
      <ProviderFilter
        labels={{
          filterByProvider: t('usersTable.filterByProvider'),
          allProviders: t('usersTable.allProviders'),
        }}
        providerNames={providerNames}
      />
    </div>
  );
}
