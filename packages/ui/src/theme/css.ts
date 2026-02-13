import { darkColors, lightColors } from "./colors";

function camelToKebab(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

export function generateThemeCSS(): string {
  const lightVars = Object.entries(lightColors)
    .map(([key, value]) => `    --color-${camelToKebab(key)}: ${value};`)
    .join("\n");
  const darkVars = Object.entries(darkColors)
    .map(([key, value]) => `    --color-${camelToKebab(key)}: ${value};`)
    .join("\n");

  return `:root {\n${lightVars}\n  }\n\n  .dark {\n${darkVars}\n  }`;
}
