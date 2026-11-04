/**
 * Login providers this product knows how to name and reason about.
 *
 * `email` is the password login (Supabase Auth's `email` identity). `google`
 * and `apple` are the OAuth providers. Apple has no entry point on the web yet
 * — it will arrive with the iOS app — but it is already part of the type so
 * that the unlink guard and the provider dictionary are ready the day an
 * `apple` identity shows up on an account.
 *
 * Anything else that Supabase Auth might one day report (a provider enabled
 * on the Dashboard before the app learned about it) is dropped by the readers
 * that use {@link isKnownAuthProvider}: it has no dictionary entry and is not
 * a login method the guard can reason about.
 */
export type KnownAuthProvider = "email" | "google" | "apple";

const KNOWN_AUTH_PROVIDERS: ReadonlySet<string> = new Set<KnownAuthProvider>([
  "email",
  "google",
  "apple",
]);

export function isKnownAuthProvider(
  provider: string,
): provider is KnownAuthProvider {
  return KNOWN_AUTH_PROVIDERS.has(provider);
}
