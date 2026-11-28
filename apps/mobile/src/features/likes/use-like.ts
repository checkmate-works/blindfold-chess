import { useCallback, useEffect, useRef, useState } from "react";
import { Alert } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { useAuth } from "../../auth/use-auth";
import { showAuthPrompt } from "../account/auth-prompt";
import {
  fetchLikeState,
  likePath,
  toggleLike,
  type LikeState,
  type LikeTarget,
} from "./likes-api";

export type UseLike = {
  /**
   * False in a build without accounts, where nobody could like anything:
   * the caller draws no button at all.
   */
  available: boolean;
  /** Undefined until the first read answers (or when it failed). */
  state: LikeState | undefined;
  pending: boolean;
  press: () => void;
};

/**
 * One like button's state and its press — the web's `useLikeToggle`. A
 * player who cannot like yet (signed out, or no username) gets the sign-in
 * prompt instead of a request; anyone else sees the heart change at once
 * and the server's count when it answers, or the old state back if the
 * request fails.
 *
 * The state is read again whenever the viewer changes, so signing in from
 * the prompt shows that account's own like on return.
 */
export function useLike(target: LikeTarget): UseLike {
  const { t } = useTranslation();
  const router = useRouter();
  const auth = useAuth();
  const [state, setState] = useState<LikeState | undefined>(undefined);
  const [pending, setPending] = useState(false);
  const path = likePath(target);
  const targetRef = useRef(target);
  targetRef.current = target;

  const ready = auth.status === "signedIn" || auth.status === "signedOut";
  const signedIn = auth.status === "signedIn";
  const viewer = signedIn ? (auth.email ?? "signedIn") : auth.status;

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    void fetchLikeState(targetRef.current, signedIn).then((result) => {
      if (!cancelled) setState(result === "failed" ? undefined : result);
    });
    return () => {
      cancelled = true;
    };
  }, [path, ready, signedIn, viewer]);

  const press = useCallback(() => {
    if (pending) return;
    if (auth.status === "signedOut") {
      showAuthPrompt("signedOut", t, router);
      return;
    }
    if (auth.status !== "signedIn") return;
    if (auth.account?.username === null) {
      showAuthPrompt("username", t, router);
      return;
    }
    const before = state;
    if (before) {
      setState({
        liked: !before.liked,
        likeCount: Math.max(0, before.likeCount + (before.liked ? -1 : 1)),
      });
    }
    setPending(true);
    void toggleLike(targetRef.current).then((result) => {
      setPending(false);
      if (typeof result !== "string") {
        setState(result);
        return;
      }
      setState(before);
      if (result === "signedOut") showAuthPrompt("signedOut", t, router);
      else if (result === "profileRequired") {
        showAuthPrompt("username", t, router);
      } else Alert.alert(t("likes.failed"));
    });
  }, [pending, auth.status, auth.account, state, t, router]);

  return { available: auth.status !== "unavailable", state, pending, press };
}
