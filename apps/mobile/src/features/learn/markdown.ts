/**
 * A small markdown parser for the learn articles — the subset they use:
 * headings, paragraphs, nested bullet and numbered lists, tables, block
 * quotes, rules, fenced code, `$$` math blocks and images on a line of their
 * own. Inline markup (bold, italic, code, links, `$` math) is split by
 * {@link parseInline}.
 *
 * The web renders the same markdown with remark and KaTeX; neither runs in
 * React Native, and the articles' math is simple enough (absolute values,
 * coordinate pairs, `\max`, `\in`) that plain text with the LaTeX commands
 * replaced reads the same.
 */

export type MdInline =
  | { type: "text"; text: string }
  | { type: "bold"; children: MdInline[] }
  | { type: "italic"; children: MdInline[] }
  | { type: "code"; text: string }
  | { type: "math"; text: string }
  | { type: "link"; href: string; children: MdInline[] };

export type MdListItem = { inline: MdInline[]; children: MdBlock[] };

export type MdBlock =
  | { type: "heading"; level: number; inline: MdInline[] }
  | { type: "paragraph"; inline: MdInline[] }
  | { type: "list"; ordered: boolean; start: number; items: MdListItem[] }
  | { type: "table"; header: MdInline[][]; rows: MdInline[][][] }
  | { type: "quote"; blocks: MdBlock[] }
  | { type: "rule" }
  | { type: "code"; text: string }
  | { type: "math"; text: string }
  | { type: "image"; alt: string; src: string };

const LATEX_REPLACEMENTS: [RegExp, string][] = [
  [/\\max\b/g, "max"],
  [/\\min\b/g, "min"],
  [/\\in\b/g, "∈"],
  [/\\times\b/g, "×"],
  [/\\cdot\b/g, "·"],
  [/\\leq?\b/g, "≤"],
  [/\\geq?\b/g, "≥"],
  [/\\neq?\b/g, "≠"],
  [/\\pm\b/g, "±"],
  [/\\ldots\b/g, "…"],
  [/\\text\{([^}]*)\}/g, "$1"],
  [/\\left|\\right/g, ""],
  [/\\([{}])/g, "$1"],
  [/\\[,;! ]/g, " "],
];

const SUBSCRIPT_DIGITS = "₀₁₂₃₄₅₆₇₈₉";

/** LaTeX as plain text: commands to symbols, `x_1` to `x₁`. */
export function latexToText(latex: string): string {
  let text = latex;
  for (const [pattern, replacement] of LATEX_REPLACEMENTS) {
    text = text.replace(pattern, replacement);
  }
  text = text.replace(/_\{?(\d)\}?/g, (_, d: string) => SUBSCRIPT_DIGITS[+d]);
  return text.replace(/\s+/g, " ").trim();
}

/** Splits inline markdown into styled runs. */
export function parseInline(source: string): MdInline[] {
  const out: MdInline[] = [];
  let text = "";
  const flush = () => {
    if (text) out.push({ type: "text", text });
    text = "";
  };
  let i = 0;
  while (i < source.length) {
    const rest = source.slice(i);
    let m: RegExpMatchArray | null;
    if ((m = rest.match(/^\*\*(.+?)\*\*/s))) {
      flush();
      out.push({ type: "bold", children: parseInline(m[1]) });
    } else if ((m = rest.match(/^\*([^*\s][^*]*?)\*/))) {
      flush();
      out.push({ type: "italic", children: parseInline(m[1]) });
    } else if ((m = rest.match(/^`([^`]+)`/))) {
      flush();
      out.push({ type: "code", text: m[1] });
    } else if ((m = rest.match(/^\$([^$]+)\$/))) {
      flush();
      out.push({ type: "math", text: latexToText(m[1]) });
    } else if ((m = rest.match(/^\[([^\]]+)\]\(([^)\s]*)\)/))) {
      flush();
      out.push({ type: "link", href: m[2], children: parseInline(m[1]) });
    } else {
      text += source[i];
      i += 1;
      continue;
    }
    i += m[0].length;
  }
  flush();
  return out;
}

const LIST_ITEM = /^(\s*)([-*+]|\d+\.)\s+(.*)$/;

function indentOf(line: string): number {
  return line.match(/^\s*/)?.[0].length ?? 0;
}

function splitRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

/** Parses markdown into blocks. */
export function parseMarkdown(source: string): MdBlock[] {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  return parseLines(lines);
}

function parseLines(lines: string[]): MdBlock[] {
  const blocks: MdBlock[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed === "") {
      i += 1;
      continue;
    }

    if (trimmed.startsWith("```")) {
      const body: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        body.push(lines[i]);
        i += 1;
      }
      blocks.push({ type: "code", text: body.join("\n") });
      i += 1;
      continue;
    }

    if (trimmed.startsWith("$$")) {
      const body: string[] = [trimmed.slice(2)];
      i += 1;
      while (i < lines.length && !lines[i].includes("$$")) {
        body.push(lines[i]);
        i += 1;
      }
      if (i < lines.length) body.push(lines[i].replace("$$", ""));
      blocks.push({ type: "math", text: latexToText(body.join(" ")) });
      i += 1;
      continue;
    }

    const heading = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      blocks.push({
        type: "heading",
        level: heading[1].length,
        inline: parseInline(heading[2]),
      });
      i += 1;
      continue;
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      blocks.push({ type: "rule" });
      i += 1;
      continue;
    }

    const image = trimmed.match(/^!\[([^\]]*)\]\(([^)]*)\)$/);
    if (image) {
      blocks.push({ type: "image", alt: image[1], src: image[2] });
      i += 1;
      continue;
    }

    if (trimmed.startsWith("|")) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        rows.push(splitRow(lines[i]));
        i += 1;
      }
      const isDivider = (row: string[]) =>
        row.every((cell) => /^:?-{2,}:?$/.test(cell));
      const [header, ...body] = rows;
      blocks.push({
        type: "table",
        header: header.map(parseInline),
        rows: body
          .filter((row) => !isDivider(row))
          .map((row) => row.map(parseInline)),
      });
      continue;
    }

    if (trimmed.startsWith(">")) {
      const quoted: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        quoted.push(lines[i].trim().replace(/^>\s?/, ""));
        i += 1;
      }
      blocks.push({ type: "quote", blocks: parseLines(quoted) });
      continue;
    }

    if (LIST_ITEM.test(line)) {
      const baseIndent = indentOf(line);
      const ordered = /^\s*\d+\./.test(line);
      const start = ordered ? parseInt(trimmed, 10) : 1;
      const items: MdListItem[] = [];
      while (i < lines.length) {
        const current = lines[i];
        const match = current.match(LIST_ITEM);
        if (current.trim() === "") {
          // A blank line ends the list unless an item of it follows.
          const next = lines[i + 1];
          if (
            next !== undefined &&
            LIST_ITEM.test(next) &&
            indentOf(next) >= baseIndent
          ) {
            i += 1;
            continue;
          }
          break;
        }
        if (match && indentOf(current) === baseIndent) {
          items.push({ inline: parseInline(match[3]), children: [] });
          i += 1;
          continue;
        }
        if (indentOf(current) > baseIndent && items.length > 0) {
          // Lines indented under the item: a nested list or continuation.
          const nested: string[] = [];
          while (
            i < lines.length &&
            lines[i].trim() !== "" &&
            indentOf(lines[i]) > baseIndent
          ) {
            nested.push(lines[i]);
            i += 1;
          }
          const minIndent = Math.min(...nested.map(indentOf));
          items[items.length - 1].children.push(
            ...parseLines(nested.map((l) => l.slice(minIndent))),
          );
          continue;
        }
        break;
      }
      blocks.push({ type: "list", ordered, start, items });
      continue;
    }

    const paragraph: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !/^(#{1,6}\s|```|\$\$|>|\||!\[)/.test(lines[i].trim()) &&
      !LIST_ITEM.test(lines[i])
    ) {
      paragraph.push(lines[i].trim());
      i += 1;
    }
    blocks.push({
      type: "paragraph",
      inline: parseInline(paragraph.join(" ")),
    });
  }
  return blocks;
}
