import { useCallback, useEffect, useRef, useState } from "react";
import type { RemoteChallengePort } from "@blindfold-chess/features/challenge-attempt";
import type { ChallengeMenuType } from "@blindfold-chess/features/practice-registry";

import { useAuth } from "../../auth/use-auth";
import { beginChallenge } from "./challenge-api";

export type ChallengeAttempt<Q> =
  | { attemptId: string; remote: RemoteChallengePort<Q> }
  | { attemptId: null; remote: undefined };

export type ChallengeAttemptState<Q> =
  | { status: "loading" }
  | ({ status: "ready" } & ChallengeAttempt<Q>)
  | { status: "error"; reason: "rateLimited" | "failed"; retry: () => void };

const UNRECORDED = {
  status: "ready",
  attemptId: null,
  remote: undefined,
} as const;

/**
 * Decides once, before the session starts, whether this run is recorded:
 * signed in → a server attempt (questions and grading from the server);
 * signed out, banned, or no backend → a local run. A failed start offers a
 * retry rather than silently dropping to unrecorded, so a signed-in player
 * never plays a run they think counts but does not.
 */
export function useChallengeAttempt<Q>(
  menuType: ChallengeMenuType,
  settings: unknown,
): ChallengeAttemptState<Q> {
  const auth = useAuth();
  const [state, setState] = useState<ChallengeAttemptState<Q>>({
    status: "loading",
  });
  const [token, setToken] = useState(0);
  const settled = useRef(false);
  const settingsRef = useRef(settings);

  const retry = useCallback(() => {
    settled.current = false;
    setState({ status: "loading" });
    setToken((t) => t + 1);
  }, []);

  const authResolved = auth.status !== "loading";
  const signedIn = auth.status === "signedIn";
  useEffect(() => {
    if (settled.current || !authResolved) return;
    if (!signedIn) {
      settled.current = true;
      setState(UNRECORDED);
      return;
    }
    let cancelled = false;
    void beginChallenge<Q>(menuType, settingsRef.current).then((result) => {
      if (cancelled) return;
      if (result.kind === "error") {
        setState({ status: "error", reason: result.reason, retry });
        return;
      }
      settled.current = true;
      setState(
        result.kind === "recorded"
          ? {
              status: "ready",
              attemptId: result.attemptId,
              remote: result.remote,
            }
          : UNRECORDED,
      );
    });
    return () => {
      cancelled = true;
    };
  }, [authResolved, signedIn, menuType, token, retry]);

  return state;
}
