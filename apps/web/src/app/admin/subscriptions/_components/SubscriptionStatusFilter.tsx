'use client';

import { Field, Select } from '@/app/admin/_components/forms';
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
    <Field label={labels.filterByStatus} htmlFor="subscription-status-filter">
      <Select
        surface="card"
        fullWidth={false}
        id="subscription-status-filter"
        value={status}
        onChange={(e) => {
          setParams(
            { status: e.target.value || null, page: null },
            { history: 'push', shallow: false }
          );
        }}
      >
        <option value="">{labels.allStatuses}</option>
        <option value="active">{labels.active}</option>
        <option value="trialing">{labels.trialing}</option>
        <option value="past_due">{labels.pastDue}</option>
        <option value="canceled">{labels.canceled}</option>
        <option value="unpaid">{labels.unpaid}</option>
      </Select>
    </Field>
  );
}
