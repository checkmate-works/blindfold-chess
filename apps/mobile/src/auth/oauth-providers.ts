/**
 * Which one-tap sign-in providers the app offers, and how it reads the
 * browser's answer for the ones that go through a browser. Pure, so the
 * rules are testable without React Native.
 */

export type OAuthProvider = "apple" | "google";

/**
 * The providers to show.
 *
 * - Apple is offered on every iOS build, with nothing to turn on. It uses the
 *   native Sign in with Apple sheet, which exists only on iOS; Android would
 *   need the browser flow and an Apple Services ID, which this app does not
 *   set up. It needs Apple enabled in the Supabase project with the bundle
 *   ID as a client ID.
 * - Google is offered when the build variable `EXPO_PUBLIC_OAUTH_PROVIDERS`
 *   (comma-separated, e.g. `google`) lists it, so a build made before Google
 *   is set up in Supabase shows no button that could only fail. `apple` may
 *   still be listed; it changes nothing. App Store Review Guideline 4.8
 *   rejects an app that offers a third-party login such as Google without
 *   Sign in with Apple, which iOS now always has.
 *
 * The order is fixed — Apple first — because Apple's Human Interface
 * Guidelines ask for its button to be at least as prominent as the others.
 */
export function resolveOAuthProviders({
  setting,
  platform,
}: {
  readonly setting: string | undefined;
  readonly platform: string;
}): OAuthProvider[] {
  const listed = new Set(
    (setting ?? "")
      .split(",")
      .map((name) => name.trim().toLowerCase())
      .filter(Boolean),
  );
  return [
    ...(platform === "ios" ? (["apple"] as const) : []),
    ...(listed.has("google") ? (["google"] as const) : []),
  ];
}

export type OAuthRedirect =
  { kind: "code"; code: string } | { kind: "error"; description: string };

/**
 * Reads the URL Supabase sends the browser back to after a PKCE sign-in.
 * Success carries `?code=`; a refusal (the user denied consent, the provider
 * is disabled) carries `error` / `error_description`, in the query or, from
 * some Supabase versions, in the fragment.
 */
export function parseOAuthRedirect(url: string): OAuthRedirect {
  const params = new URLSearchParams();
  const queryStart = url.indexOf("?");
  const hashStart = url.indexOf("#");
  if (queryStart !== -1) {
    const end = hashStart > queryStart ? hashStart : url.length;
    new URLSearchParams(url.slice(queryStart + 1, end)).forEach((v, k) =>
      params.set(k, v),
    );
  }
  if (hashStart !== -1) {
    new URLSearchParams(url.slice(hashStart + 1)).forEach((v, k) => {
      if (!params.has(k)) params.set(k, v);
    });
  }
  const code = params.get("code");
  if (code) return { kind: "code", code };
  return {
    kind: "error",
    description:
      params.get("error_description") ??
      params.get("error") ??
      "no code in redirect",
  };
}
