import { useEffect } from "react";
import { useRouter } from "expo-router";

/**
 * The landing route for `blindfold-chess://auth-callback`, the redirect a
 * Google sign-in returns through (`OAUTH_REDIRECT_URL` in `auth/oauth.ts`).
 *
 * The in-app browser session hands that URL straight to `signInWithGoogle`,
 * which exchanges the code; nothing here reads it. On Android the system
 * also delivers the URL to the app as a deep link, and Expo Router navigates
 * to it — without this route that would show the unmatched-route screen over
 * the sign-in modal. This screen steps straight back to wherever the user
 * was, or to home when it is the first route (the app was cold-started on
 * the link).
 */
export default function AuthCallback() {
  const router = useRouter();
  useEffect(() => {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  }, [router]);
  return null;
}
