const ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#x27;",
};

const ESCAPE_REGEX = /[&<>"']/g;

/**
 * Escape the five HTML-significant characters, which makes the result safe
 * inside element text and inside single- or double-quoted attribute values.
 * It is not enough for unquoted attributes, URLs (`javascript:` passes
 * through), or `<script>` / `<style>` contents.
 */
export function escapeHtml(str: string): string {
  // `?? char` instead of `!`: nothing enforces that ESCAPE_REGEX and
  // ESCAPE_MAP stay in sync, and a drift must not inject `undefined` into
  // escaped output.
  return str.replace(ESCAPE_REGEX, (char) => ESCAPE_MAP[char] ?? char);
}
