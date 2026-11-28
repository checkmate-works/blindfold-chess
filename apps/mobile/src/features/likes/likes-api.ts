import { callMobileApi, errorCodeOf } from "../../auth/api-client";

/** The viewer's like and the total, as the server counts them. */
export type LikeState = { liked: boolean; likeCount: number };

/**
 * What can be liked in the app, and the route that holds its like: a
 * featured puzzle (`/puzzles/[id]/like`) or a public announcement
 * (`/announcements/[slug]/like`, in the app's language, which picks the
 * locale variant a like is written against as on the web).
 */
export type LikeTarget =
  | { kind: "puzzle"; id: string }
  | { kind: "announcement"; slug: string; locale: string };

export function likePath(target: LikeTarget): string {
  return target.kind === "puzzle"
    ? `/puzzles/${encodeURIComponent(target.id)}/like`
    : `/announcements/${encodeURIComponent(target.slug)}/like?locale=${encodeURIComponent(target.locale)}`;
}

function isLikeState(v: unknown): v is LikeState {
  return (
    typeof v === "object" &&
    v !== null &&
    typeof (v as LikeState).liked === "boolean" &&
    typeof (v as LikeState).likeCount === "number"
  );
}

async function readState(response: Response): Promise<LikeState | "failed"> {
  if (!response.ok) return "failed";
  const body: unknown = await response.json().catch(() => undefined);
  return isLikeState(body) ? body : "failed";
}

/**
 * The like's state for this viewer. Signed out it is read without a token,
 * and `liked` is false. Never rejects.
 */
export async function fetchLikeState(
  target: LikeTarget,
  signedIn: boolean,
): Promise<LikeState | "failed"> {
  const response = await callMobileApi(likePath(target), {
    anonymous: !signedIn,
  });
  return typeof response === "string" ? "failed" : readState(response);
}

/**
 * Likes or unlikes for the signed-in user. Never rejects.
 * - `signedOut` — no session, or the server no longer accepts it.
 * - `profileRequired` — signed in without a username: a like names its
 *   liker, as on the web, so it waits until one is chosen.
 */
export async function toggleLike(
  target: LikeTarget,
): Promise<LikeState | "signedOut" | "profileRequired" | "failed"> {
  const response = await callMobileApi(likePath(target), { method: "POST" });
  if (response === "signedOut") return "signedOut";
  if (typeof response === "string") return "failed";
  if (response.status === 403) {
    const code = await errorCodeOf(response);
    if (code === "profileRequired") return "profileRequired";
    return "failed";
  }
  return readState(response);
}
