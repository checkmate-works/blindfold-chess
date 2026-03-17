'use client';

import { parseAsInteger, parseAsString, useQueryStates } from 'nuqs';

type StatusFilterProps = {
  labels: {
    filterByStatus: string;
    allStatuses: string;
    active: string;
    banned: string;
    anonymous: string;
  };
};

export function StatusFilter({ labels }: StatusFilterProps) {
  const [{ status }, setParams] = useQueryStates({
    status: parseAsString.withDefault(''),
    page: parseAsInteger.withDefault(1),
  });

  return (
    <div>
      <label htmlFor="status-filter" className="block text-sm font-medium mb-1">
        {labels.filterByStatus}
      </label>
      <select
        id="status-filter"
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
        <option value="banned">{labels.banned}</option>
        <option value="anonymous">{labels.anonymous}</option>
      </select>
    </div>
  );
}
