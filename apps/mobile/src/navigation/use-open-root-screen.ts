import { useRouter, useSegments } from "expo-router";
import type { Href } from "expo-router";
import { useCallback } from "react";

import { isInSessionModal } from "./in-session-modal";
import { useCloseSession } from "./use-close-session";

/**
 * Opens a root-stack screen (an article, My Records) from a part that is
 * drawn both on root-stack screens and inside the session modal, such as
 * the related-articles rows a setup and its result share.
 *
 * @description
 * On a root-stack screen it is a plain push. Inside the session modal a
 * push would open the screen under the modal on iOS, out of sight, and the
 * next "close" would land on it instead of the setup; there it closes the
 * modal first (`closeAndPush`), so the screen opens over the setup and its
 * back button returns there.
 */
export function useOpenRootScreen(): (href: Href) => void {
  const router = useRouter();
  const segments = useSegments();
  const { closeAndPush } = useCloseSession();
  const inSession = isInSessionModal(segments);
  return useCallback(
    (href: Href) => (inSession ? closeAndPush(href) : router.push(href)),
    [inSession, closeAndPush, router],
  );
}
