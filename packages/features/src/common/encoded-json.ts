/**
 * Decode a URI-encoded JSON parameter without trusting its shape.
 *
 * Result screens receive their payload as a JSON string in the URL, so
 * anything can arrive: a link cut short by a chat app, a hand-edited value, a
 * payload an older build wrote. Both steps can throw — `decodeURIComponent` on
 * a stray `%`, `JSON.parse` on anything that is not JSON — and the value that
 * comes back is `unknown`, for the caller's own guard to narrow.
 *
 * @returns The parsed value, or `undefined` when the parameter is absent or
 * cannot be decoded. JSON cannot express `undefined`, so it never stands for
 * a real payload.
 */
export function parseEncodedJson(param: string | null | undefined): unknown {
  if (!param) return undefined;
  try {
    return JSON.parse(decodeURIComponent(param)) as unknown;
  } catch {
    return undefined;
  }
}

/** Whether a decoded value is a plain JSON object (not `null`, not an array). */
export function isJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
