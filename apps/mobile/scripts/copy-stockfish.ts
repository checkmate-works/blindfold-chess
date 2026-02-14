import { copyFile, mkdir } from "fs/promises";
import { join } from "path";

async function copyStockfishFiles() {
  const sourceDir = "node_modules/stockfish/src";
  const targetDir = "assets/stockfish";

  await mkdir(targetDir, { recursive: true });

  // Rename to .js.bin so Metro treats it as a binary asset, not JS source.
  // stockfish.js contains Node.js-specific code (require("fs")) that Metro
  // cannot resolve. The file is only executed inside a WebView, not in RN.
  await copyFile(
    join(sourceDir, "stockfish-17.1-lite-single-03e3232.js"),
    join(targetDir, "stockfish.js.bin"),
  );
  await copyFile(
    join(sourceDir, "stockfish-17.1-lite-single-03e3232.wasm"),
    join(targetDir, "stockfish.wasm"),
  );
}

copyStockfishFiles().catch((error) => {
  console.error("Failed to copy Stockfish files:", error);
  process.exit(1);
});
