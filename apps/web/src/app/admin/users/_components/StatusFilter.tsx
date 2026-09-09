'use client';

import { StatusQueryFilter } from '@/app/admin/_components/StatusQueryFilter';

type StatusFilterProps = {
  labels: {
    filterByStatus: string;
    allStatuses: string;
    active: string;
    banned: string;
    anonymous: string;
    deleted: string;
  };
};

export function StatusFilter({ labels }: StatusFilterProps) {
  return (
    <StatusQueryFilter
      id="status-filter"
      labels={labels}
      options={[
        { value: 'active', label: labels.active },
        { value: 'banned', label: labels.banned },
        { value: 'anonymous', label: labels.anonymous },
        { value: 'deleted', label: labels.deleted },
      ]}
    />
  );
}
