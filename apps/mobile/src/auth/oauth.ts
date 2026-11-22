import { Platform } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";

import {
  parseOAuthRedirect,
  resolveOAuthProviders,
  type OAuthProvider,
} from "./oauth-providers";
import { supabase } from "./supabase-client";

/**
 * The providers this build offers (see `resolveOAuthProviders`), or none when
 * the build has no backend.
 */
export const OAUTH_PROVIDERS: readonly OAuthProvider[] = supabase
  ? resolveOAuthProviders({
      setting: process.env.EXPO_PUBLIC_OAUTH_PROVIDERS,
      platform: Platform.OS,
    })
  : [];

/**
 * Where Supabase sends the browser back to after a Google sign-in:
 * `blindfold-chess://auth-callback` in a build, an `exp://…/--/auth-callback`
 * URL in Expo Go. Supabase only redirects to a URL on its allow list
 * (Authentication → URL Configuration → Redirect URLs), so this exact URL has
 * to be listed there before the Google button can work.
 */
export const OAUTH_REDIRECT_URL = Linking.createURL("auth-callback");

/** `cancelled`: the user closed the sheet or browser; show nothing. */
export type OAuthResult = "signedIn" | "cancelled" | "failed";

/**
 * Sign in with Apple through the native sheet, then hands Apple's ID token to
 * Supabase (`signInWithIdToken`), which creates the user on first use.
 *
 * The nonce ties the token to this request so a token captured elsewhere
 * cannot be replayed: Apple embeds the SHA-256 of the nonce in the token, and
 * Supabase hashes the raw nonce it is given and compares the two.
 */
export async function signInWithApple(): Promise<OAuthResult> {
  if (!supabase) return "failed";
  const rawNonce = Crypto.randomUUID();
  const hashedNonce = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    rawNonce,
  );
  let identityToken: string | null;
  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [AppleAuthentication.AppleAuthenticationScope.EMAIL],
      nonce: hashedNonce,
    });
    identityToken = credential.identityToken;
  } catch (error) {
    if ((error as { code?: string }).code === "ERR_REQUEST_CANCELED") {
      return "cancelled";
    }
    console.warn("Sign in with Apple failed", error);
    return "failed";
  }
  if (!identityToken) return "failed";
  const { error } = await supabase.auth.signInWithIdToken({
    provider: "apple",
    token: identityToken,
    nonce: rawNonce,
  });
  if (error) {
    console.warn("Supabase rejected the Apple token", error);
    return "failed";
  }
  return "signedIn";
}

/**
 * Google sign-in through Supabase's hosted OAuth page in an in-app browser
 * session (ASWebAuthenticationSession on iOS, Custom Tabs on Android), with
 * PKCE: Supabase redirects back with a one-time `code`, which is exchanged
 * here for the session. No Google client ID lives in the app; the Google
 * provider configured in Supabase for the web is the one used.
 */
export async function signInWithGoogle(): Promise<OAuthResult> {
  if (!supabase) return "failed";
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: OAUTH_REDIRECT_URL, skipBrowserRedirect: true },
  });
  if (error || !data.url) {
    console.warn("Could not start Google sign-in", error);
    return "failed";
  }
  const result = await WebBrowser.openAuthSessionAsync(
    data.url,
    OAUTH_REDIRECT_URL,
  );
  if (result.type !== "success") {
    return result.type === "cancel" || result.type === "dismiss"
      ? "cancelled"
      : "failed";
  }
  const redirect = parseOAuthRedirect(result.url);
  if (redirect.kind === "error") {
    console.warn("Google sign-in was refused", redirect.description);
    return "failed";
  }
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(
    redirect.code,
  );
  if (exchangeError) {
    console.warn("Could not exchange the Google sign-in code", exchangeError);
    return "failed";
  }
  return "signedIn";
}

export function signInWith(provider: OAuthProvider): Promise<OAuthResult> {
  return provider === "apple" ? signInWithApple() : signInWithGoogle();
}
