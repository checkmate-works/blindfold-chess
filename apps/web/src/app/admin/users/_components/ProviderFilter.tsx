'use client';

import { Field, Select } from '@/app/admin/_components/forms';
import { parseAsInteger, parseAsStringLiteral, useQueryStates } from 'nuqs';

import { SIGNUP_METHOD_ORDER } from '../_lib/signup-method';

// Keep in sync with `PROVIDER_FILTER_VALUES` in page.tsx.
const PROVIDER_FILTER_VALUES = ['', ...SIGNUP_METHOD_ORDER] as const;

type ProviderFilterProps = {
  labels: {
    filterByProvider: string;
    allProviders: string;
  };
  providerNames: Record<(typeof SIGNUP_METHOD_ORDER)[number], string>;
};

export function ProviderFilter({ labels, providerNames }: ProviderFilterProps) {
  const [{ provider }, setParams] = useQueryStates({
    provider: parseAsStringLiteral(PROVIDER_FILTER_VALUES).withDefault(''),
    page: parseAsInteger.withDefault(1),
  });

  return (
    <Field label={labels.filterByProvider} htmlFor="provider-filter">
      <Select
        surface="card"
        fullWidth={false}
        id="provider-filter"
        value={provider}
        onChange={(e) => {
          setParams(
            {
              provider: (e.target.value || null) as (typeof SIGNUP_METHOD_ORDER)[number] | null,
              page: null,
            },
            { history: 'push', shallow: false }
          );
        }}
      >
        <option value="">{labels.allProviders}</option>
        {SIGNUP_METHOD_ORDER.map((method) => (
          <option key={method} value={method}>
            {providerNames[method]}
          </option>
        ))}
      </Select>
    </Field>
  );
}
