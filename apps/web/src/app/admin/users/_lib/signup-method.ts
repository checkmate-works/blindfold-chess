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
export type SignupMethod = (typeof SIGNUP_METHOD_ORDER)[number];
