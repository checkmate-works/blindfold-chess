import type { KnownAuthProvider } from "./auth-provider";

/**
 * One identity linked to an account on the auth server.
 *
 * An account has at most one `email` identity — the one created by signing up
 * with an email address and password. OAuth identities are one per external
 * account, and the same provider may appear several times: a work Google and
 * a personal Google, or the old and the new one while a user re-points their
 * login ("add the new one, then remove the old one").
 */
export interface LinkedIdentity {
  /** The id the auth server gave the identity; what an unlink points at. */
  readonly id: string;
  readonly provider: KnownAuthProvider;
  /** The email of the linked external account. May differ from the account's own email. */
  readonly email?: string;
}

/**
 * Everything the login-methods UI and the unlink guard need to know about an
 * account.
 *
 * Whether the user can sign in with a password is `hasPassword`, not "has an
 * `email` identity": Supabase Auth does not create an `email` identity when a
 * Google-only user sets a password, and conversely a Google-only user who
 * completes an email change ends up with an `email` identity but no password.
 */
export interface LoginMethods {
  readonly identities: readonly LinkedIdentity[];
  readonly hasPassword: boolean;
}

/**
 * Providers that can sign a user in on the web.
 *
 * Apple's only entry point is the iOS app, so an account left with nothing
 * but an Apple identity could not sign in here again. The unlink guard counts
 * remaining web methods against this set.
 */
const WEB_LOGIN_PROVIDERS: ReadonlySet<KnownAuthProvider> = new Set([
  "email",
  "google",
]);

/**
 * Why an identity cannot be removed.
 *
 * - `notLinked` — the account has no identity with that id
 * - `notRemovable` — the `email` identity is not a removal target: a password
 *   cannot be deleted through the auth API, and the account's email address
 *   exists independently of how the user signs in
 * - `lastWebMethod` — removing it would leave no way to sign in on the web
 *   (neither a password nor a Google identity). Setting a password or adding
 *   another Google account first makes it removable
 */
export type IdentityRemovalBlocker =
  "notLinked" | "notRemovable" | "lastWebMethod";

export type IdentityRemovalDecision =
  | { readonly allowed: true; readonly identity: LinkedIdentity }
  | { readonly allowed: false; readonly reason: IdentityRemovalBlocker };

/**
 * Decide whether an identity may be unlinked.
 *
 * Three rules: the identity exists, it is a removable kind, and at least one
 * web login method survives the removal. This is stricter than the auth
 * server's own rule (it only refuses to delete the last identity): an account
 * whose last identity is Apple could still sign in on iOS, but not on the web
 * the user is currently using.
 *
 * The Server Action and the "Remove" button share this function so the
 * button is disabled (with the reason shown) exactly when the server would
 * refuse.
 */
export function evaluateIdentityRemoval(
  methods: LoginMethods,
  identityId: string,
): IdentityRemovalDecision {
  const identity = methods.identities.find((i) => i.id === identityId);
  if (!identity) return { allowed: false, reason: "notLinked" };
  if (identity.provider === "email") {
    return { allowed: false, reason: "notRemovable" };
  }
  const remaining = methods.identities.filter((i) => i.id !== identityId);
  if (
    !hasWebLoginMethod({
      identities: remaining,
      hasPassword: methods.hasPassword,
    })
  ) {
    return { allowed: false, reason: "lastWebMethod" };
  }
  return { allowed: true, identity };
}

/**
 * Whether the account has at least one way to sign in on the web.
 *
 * A password counts regardless of whether an `email` identity exists (see
 * {@link LoginMethods}); an `email` identity without a password does not.
 */
export function hasWebLoginMethod(methods: LoginMethods): boolean {
  return (
    methods.hasPassword ||
    methods.identities.some(
      (i) => i.provider !== "email" && WEB_LOGIN_PROVIDERS.has(i.provider),
    )
  );
}
