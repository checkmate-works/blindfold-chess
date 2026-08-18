/**
 * Signup method (a.k.a. "provider" in Supabase auth & URL params).
 * Naming convention: URL query param and low-level code use `provider`,
 * while UI concepts and types use `signupMethod`.
 *
 * NOTE: This module MUST remain free of server-only dependencies
 * (no `lib/db`, no `SupabaseClient`, no Node built-ins) because it
 * is imported from Client Components such as `ProviderFilter.tsx`.
 */
export const SIGNUP_METHOD_ORDER = ['google', 'email', 'unknown'] as const;

/**
 * `SignupMethod` → the `Admin.usersTable.provider*` i18n key naming it. Lives
 * next to the order so label maps derive from one place; the users list and
 * the user detail page each had their own copy.
 */
export const SIGNUP_METHOD_I18N_KEY: Record<(typeof SIGNUP_METHOD_ORDER)[number], string> = {
  google: 'providerGoogle',
  email: 'providerEmail',
  unknown: 'providerUnknown',
};
export type SignupMethod = (typeof SIGNUP_METHOD_ORDER)[number];
