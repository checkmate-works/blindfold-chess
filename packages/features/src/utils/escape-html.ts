const ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#x27;",
};

const ESCAPE_REGEX = /[&<>"']/g;

export function escapeHtml(str: string): string {
  // `?? char` instead of `!`: nothing enforces that ESCAPE_REGEX and
  // ESCAPE_MAP stay in sync, and a drift must not inject `undefined` into
  // escaped output.
  return str.replace(ESCAPE_REGEX, (char) => ESCAPE_MAP[char] ?? char);
}
