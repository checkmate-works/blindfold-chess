import type { ServerTranslator } from '@/i18n/translator';

import { SIGNUP_METHOD_I18N_KEY, SIGNUP_METHOD_ORDER } from './signup-method';

/**
 * Whitelist for the `provider` URL param. Includes '' (= no filter / default).
 * Anything outside this list falls back to '' (filter cleared). Shared by the
 * users list and the user stats page, which accept the same filter.
 */
export const PROVIDER_FILTER_VALUES = ['', ...SIGNUP_METHOD_ORDER] as const;

export type ProviderNames = Record<(typeof SIGNUP_METHOD_ORDER)[number], string>;

/** Signup method → display label, for filters, badges and the chart axis. */
export function buildProviderNames(t: ServerTranslator): ProviderNames {
  return Object.fromEntries(
    SIGNUP_METHOD_ORDER.map((method) => [method, t(`usersTable.${SIGNUP_METHOD_I18N_KEY[method]}`)])
  ) as ProviderNames;
}
