'use client';

import { StatusQueryFilter } from '@/app/admin/_components/StatusQueryFilter';

type SubscriptionStatusFilterProps = {
  labels: {
    filterByStatus: string;
    allStatuses: string;
    active: string;
    trialing: string;
    pastDue: string;
    canceled: string;
    unpaid: string;
  };
};

export function SubscriptionStatusFilter({ labels }: SubscriptionStatusFilterProps) {
  return (
    <StatusQueryFilter
      id="subscription-status-filter"
      labels={labels}
      options={[
        { value: 'active', label: labels.active },
        { value: 'trialing', label: labels.trialing },
        { value: 'past_due', label: labels.pastDue },
        { value: 'canceled', label: labels.canceled },
        { value: 'unpaid', label: labels.unpaid },
      ]}
    />
  );
}
