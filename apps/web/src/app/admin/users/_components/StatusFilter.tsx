'use client';

import { Field, Select } from '@/app/admin/_components/forms';
import { parseAsInteger, parseAsString, useQueryStates } from 'nuqs';

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
  const [{ status }, setParams] = useQueryStates({
    status: parseAsString.withDefault(''),
    page: parseAsInteger.withDefault(1),
  });

  return (
    <Field label={labels.filterByStatus} htmlFor="status-filter">
      <Select
        surface="card"
        fullWidth={false}
        id="status-filter"
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
        <option value="banned">{labels.banned}</option>
        <option value="anonymous">{labels.anonymous}</option>
        <option value="deleted">{labels.deleted}</option>
      </Select>
    </Field>
  );
}
