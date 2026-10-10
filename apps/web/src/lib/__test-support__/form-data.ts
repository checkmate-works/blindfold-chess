/**
 * A `FormData` holding the given fields, as a submitted form would.
 *
 * A field whose value is `null` or `undefined` is left out entirely rather than
 * sent as an empty string, because "the input was absent" and "the input was
 * blank" take different paths in the actions under test (an omitted checkbox,
 * an attachment that was never chosen). Each suite keeps its own thin
 * `makeFormData` wrapper for the defaults its subject needs; this is only the
 * part that was the same in all of them.
 */
export function formDataOf(fields: Record<string, string | null | undefined>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    if (value != null) fd.set(key, value);
  }
  return fd;
}
