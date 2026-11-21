import { backendConfig, supabase } from "./supabase-client";

/**
 * Why a mobile API call produced no usable response:
 * - `signedOut` — no session, or the server rejected it even after a refresh.
 * - `offline` — the request never reached the server (or timed out).
 * - `unavailable` — the build has no backend configured.
 */
export type ApiFailure = "signedOut" | "offline" | "unavailable";

export type MobileApiInit = {
  readonly method?: "GET" | "POST" | "DELETE";
  readonly body?: unknown;
  /** Sends no token: the endpoint is public. */
  readonly anonymous?: boolean;
};

const TIMEOUT_MS = 15_000;

async function send(
  path: string,
  init: MobileApiInit,
  token: string | undefined,
): Promise<Response | "offline"> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(`${backendConfig!.apiOrigin}/api/mobile/v1${path}`, {
      method: init.method ?? "GET",
      headers: {
        Accept: "application/json",
        ...(init.body !== undefined
          ? { "Content-Type": "application/json" }
          : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      signal: controller.signal,
    });
  } catch {
    return "offline";
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Calls the web app's mobile API (`/api/mobile/v1<path>`) with the signed-in
 * user's access token. A 401 is retried once after refreshing the session:
 * the stored access token may have expired while the app was in the
 * background, before the auto-refresh ran. The response (any status) is
 * returned for the caller to read; only "no response" is a failure here.
 */
export async function callMobileApi(
  path: string,
  init: MobileApiInit = {},
): Promise<Response | ApiFailure> {
  if (!supabase || !backendConfig) return "unavailable";
  if (init.anonymous) return send(path, init, undefined);

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return "signedOut";

  const first = await send(path, init, session.access_token);
  if (first === "offline" || first.status !== 401) return first;

  const { data, error } = await supabase.auth.refreshSession();
  if (error || !data.session) return "signedOut";
  const second = await send(path, init, data.session.access_token);
  return second !== "offline" && second.status === 401 ? "signedOut" : second;
}

/** The `error` code of a JSON error body, if any. */
export async function errorCodeOf(
  response: Response,
): Promise<string | undefined> {
  try {
    const body: unknown = await response.json();
    return typeof body === "object" && body !== null && "error" in body
      ? String((body as { error: unknown }).error)
      : undefined;
  } catch {
    return undefined;
  }
}
