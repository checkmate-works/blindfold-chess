'use client';

import { parseAsInteger, parseAsString, useQueryStates } from 'nuqs';

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
  const [{ status }, setParams] = useQueryStates({
    status: parseAsString.withDefault(''),
    page: parseAsInteger.withDefault(1),
  });

  return (
    <div>
      <label htmlFor="subscription-status-filter" className="block text-sm font-medium mb-1">
        {labels.filterByStatus}
      </label>
      <select
        id="subscription-status-filter"
        value={status}
        onChange={(e) => {
          setParams(
            { status: e.target.value || null, page: null },
            { history: 'push', shallow: false }
          );
        }}
        className="border border-border rounded px-3 py-2 text-sm bg-card"
      >
        <option value="">{labels.allStatuses}</option>
        <option value="active">{labels.active}</option>
        <option value="trialing">{labels.trialing}</option>
        <option value="past_due">{labels.pastDue}</option>
        <option value="canceled">{labels.canceled}</option>
        <option value="unpaid">{labels.unpaid}</option>
      </select>
    </div>
  );
}
