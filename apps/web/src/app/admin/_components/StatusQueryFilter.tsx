'use client';

import { Field, Select } from '@/app/admin/_components/forms';
import { parseAsInteger, parseAsString, useQueryStates } from 'nuqs';

type Props = {
  /** The select's id, which the field label targets. */
  id: string;
  labels: {
    filterByStatus: string;
    /** Label of the empty option that lifts the filter. */
    allStatuses: string;
  };
  /** The statuses on offer, in display order; `value` is what `?status=` carries. */
  options: ReadonlyArray<{ value: string; label: string }>;
};

/**
 * A `?status=` select for an admin list: choosing a status pushes it into the
 * URL and resets `?page=` so the list restarts from its first page; choosing
 * "all" clears the param.
 *
 * The users and subscriptions lists each had this written out around their
 * own option list; the option list is all that differed.
 */
export function StatusQueryFilter({ id, labels, options }: Props) {
  const [{ status }, setParams] = useQueryStates({
    status: parseAsString.withDefault(''),
    page: parseAsInteger.withDefault(1),
  });

  return (
    <Field label={labels.filterByStatus} htmlFor={id}>
      <Select
        surface="card"
        fullWidth={false}
        id={id}
        value={status}
        onChange={(e) => {
          setParams(
            { status: e.target.value || null, page: null },
            { history: 'push', shallow: false }
          );
        }}
      >
        <option value="">{labels.allStatuses}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
    </Field>
  );
}
