import { copyFile, mkdir } from 'fs/promises';
import { join } from 'path';

async function copyStockfishFiles() {
  const sourceDir = 'node_modules/stockfish.js';
  const targetDir = 'public';

  // Ensure target directory exists
  await mkdir(targetDir, { recursive: true });

  // Copy Stockfish files
  await copyFile(join(sourceDir, 'stockfish.js'), join(targetDir, 'stockfish.js'));
  await copyFile(join(sourceDir, 'stockfish.wasm'), join(targetDir, 'stockfish.wasm'));
  await copyFile(join(sourceDir, 'stockfish.wasm.js'), join(targetDir, 'stockfish.wasm.js'));

  console.log('✓ Stockfish files copied successfully');
}

copyStockfishFiles().catch((error) => {
  console.error('Failed to copy Stockfish files:', error);
  process.exit(1);
});
