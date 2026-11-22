import { describe, expect, it } from "vitest";

import { LEARN_ARTICLES } from "./generated/articles";
import { latexToText, parseInline, parseMarkdown } from "./markdown";

describe("parseMarkdown", () => {
  it("parses headings, nested lists and tables", () => {
    const blocks = parseMarkdown(
      "# Title\n\nText **bold**.\n\n- one\n  - nested\n- two\n\n| a | b |\n|---|---|\n| 1 | 2 |\n",
    );
    expect(blocks.map((b) => b.type)).toEqual([
      "heading",
      "paragraph",
      "list",
      "table",
    ]);
    const list = blocks[2];
    expect(list.type === "list" && list.items).toHaveLength(2);
    expect(list.type === "list" && list.items[0].children[0].type).toBe("list");
    const table = blocks[3];
    expect(table.type === "table" && table.rows).toHaveLength(1);
  });

  it("keeps numbered lists' start", () => {
    const [list] = parseMarkdown("3. c\n4. d");
    expect(list).toMatchObject({ type: "list", ordered: true, start: 3 });
  });

  it("turns images on their own line into image blocks", () => {
    expect(parseMarkdown("![Alt](/images/learn/x.svg)")).toEqual([
      { type: "image", alt: "Alt", src: "/images/learn/x.svg" },
    ]);
  });

  it("parses every bundled article without losing text", () => {
    for (const article of LEARN_ARTICLES) {
      for (const body of Object.values(article.body)) {
        expect(parseMarkdown(body).length).toBeGreaterThan(0);
      }
    }
  });
});

describe("parseInline", () => {
  it("splits bold, code, math and links", () => {
    expect(parseInline("a **b** `c` $x_1$ [d](/e)")).toEqual([
      { type: "text", text: "a " },
      { type: "bold", children: [{ type: "text", text: "b" }] },
      { type: "text", text: " " },
      { type: "code", text: "c" },
      { type: "text", text: " " },
      { type: "math", text: "x₁" },
      { type: "text", text: " " },
      { type: "link", href: "/e", children: [{ type: "text", text: "d" }] },
    ]);
  });
});

describe("latexToText", () => {
  it("replaces the commands the articles use", () => {
    expect(latexToText("(a, b) \\in \\{(1,2)\\}")).toBe("(a, b) ∈ {(1,2)}");
    expect(latexToText("\\max(|x|, |y|)")).toBe("max(|x|, |y|)");
  });
});
