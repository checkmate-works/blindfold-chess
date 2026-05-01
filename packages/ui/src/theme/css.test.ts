import { describe, expect, it } from "vitest";

import { boardThemeColors, darkColors, lightColors } from "./colors";
import { generateThemeCSS } from "./css";

describe("generateThemeCSS", () => {
  const css = generateThemeCSS();

  it("emits :root and .dark blocks", () => {
    expect(css).toContain(":root {");
    expect(css).toContain(".dark {");
  });

  it("emits every light-mode color as a CSS variable in :root", () => {
    // Spot-check a representative subset to confirm the loop output the
    // expected `--color-<key>` lines with the right hex values.
    expect(css).toContain(`--color-background: ${lightColors.background};`);
    expect(css).toContain(`--color-foreground: ${lightColors.foreground};`);
    expect(css).toContain(`--color-primary: ${lightColors.primary};`);
  });

  it("emits every dark-mode color as a CSS variable in .dark", () => {
    expect(css).toContain(`--color-background: ${darkColors.background};`);
    expect(css).toContain(`--color-foreground: ${darkColors.foreground};`);
  });

  it("converts camelCase keys to kebab-case (e.g. cardForeground → card-foreground)", () => {
    expect(css).toContain(
      `--color-card-foreground: ${lightColors.cardForeground};`,
    );
    expect(css).toContain(
      `--color-muted-foreground: ${lightColors.mutedForeground};`,
    );
  });

  describe("board theme variables (--color-board-<theme>-<role>)", () => {
    it("emits lichess theme variables with correct hex values", () => {
      expect(css).toContain(
        `--color-board-lichess-light: ${boardThemeColors.lichess.light};`,
      );
      expect(css).toContain(
        `--color-board-lichess-dark: ${boardThemeColors.lichess.dark};`,
      );
    });

    it("emits chesscom theme variables with correct hex values", () => {
      expect(css).toContain(
        `--color-board-chesscom-light: ${boardThemeColors.chesscom.light};`,
      );
      expect(css).toContain(
        `--color-board-chesscom-dark: ${boardThemeColors.chesscom.dark};`,
      );
    });

    it("emits monotone theme variables with correct hex values", () => {
      expect(css).toContain(
        `--color-board-monotone-light: ${boardThemeColors.monotone.light};`,
      );
      expect(css).toContain(
        `--color-board-monotone-dark: ${boardThemeColors.monotone.dark};`,
      );
    });

    it("converts camelCase role keys to kebab-case (lightText → light-text)", () => {
      expect(css).toContain(
        `--color-board-lichess-light-text: ${boardThemeColors.lichess.lightText};`,
      );
      expect(css).toContain(
        `--color-board-lichess-dark-text: ${boardThemeColors.lichess.darkText};`,
      );
    });

    it("includes board theme variables inside the :root block (not .dark)", () => {
      // Board theme variables are intentionally light/dark-mode independent.
      const rootBlockEnd = css.indexOf(".dark {");
      const rootBlock = css.slice(0, rootBlockEnd);
      expect(rootBlock).toContain("--color-board-lichess-light:");
      expect(rootBlock).toContain("--color-board-chesscom-light:");
      expect(rootBlock).toContain("--color-board-monotone-light:");
    });
  });
});
