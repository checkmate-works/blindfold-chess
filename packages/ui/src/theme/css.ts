import { boardThemeColors, darkColors, lightColors } from "./colors";

function camelToKebab(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

/**
 * CSS variables for chess board theme colors. Emitted into `:root` because
 * board theme is independent of the light/dark mode color scheme — every
 * theme has its own `light`, `dark`, `lightText`, `darkText` colors that do
 * not flip when the user switches between system light and dark mode.
 *
 * Naming: `--color-board-<theme>-<role>` (e.g. `--color-board-lichess-light`).
 * apps/web references these variables from Tailwind arbitrary-value classes
 * such as `bg-[var(--color-board-lichess-light)]` so that Tailwind's static
 * analysis can detect the class names while still pulling the actual hex
 * values from this package (the single source of truth).
 */
function generateBoardThemeVars(): string {
  return Object.entries(boardThemeColors)
    .flatMap(([theme, colors]) =>
      Object.entries(colors).map(
        ([role, value]) =>
          `    --color-board-${theme}-${camelToKebab(role)}: ${value};`,
      ),
    )
    .join("\n");
}

export function generateThemeCSS(): string {
  const lightVars = Object.entries(lightColors)
    .map(([key, value]) => `    --color-${camelToKebab(key)}: ${value};`)
    .join("\n");
  const darkVars = Object.entries(darkColors)
    .map(([key, value]) => `    --color-${camelToKebab(key)}: ${value};`)
    .join("\n");
  const boardVars = generateBoardThemeVars();

  return `:root {\n${lightVars}\n${boardVars}\n  }\n\n  .dark {\n${darkVars}\n  }`;
}
