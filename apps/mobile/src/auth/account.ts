import { callMobileApi, type ApiFailure } from "./api-client";

/** `GET /api/mobile/v1/me`. */
export type MobileAccount = {
  userId: string;
  email: string | null;
  username: string | null;
  banned: boolean;
};

function isAccount(value: unknown): value is MobileAccount {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.userId === "string" &&
    (v.username === null || typeof v.username === "string") &&
    typeof v.banned === "boolean"
  );
}

export async function fetchAccount(): Promise<
  MobileAccount | { error: ApiFailure | "serverError" }
> {
  const response = await callMobileApi("/me");
  if (typeof response === "string") return { error: response };
  if (!response.ok) return { error: "serverError" };
  const body: unknown = await response.json().catch(() => undefined);
  return isAccount(body) ? body : { error: "serverError" };
}

/**
 * Sets the username (`POST /username`). Returns null on success, or the
 * web's error code (`username_taken`, `username_invalid_chars`, …).
 */
export async function submitUsername(username: string): Promise<string | null> {
  const response = await callMobileApi("/username", {
    method: "POST",
    body: { username },
  });
  if (typeof response === "string") return response;
  if (response.ok) return null;
  const body = (await response.json().catch(() => ({}))) as { error?: string };
  return body.error ?? "serverError";
}
