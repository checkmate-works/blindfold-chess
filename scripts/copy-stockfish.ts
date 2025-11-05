import { copyFile, mkdir } from 'fs/promises';
import { join } from 'path';

async function copyStockfishFiles() {
  const sourceDir = 'node_modules/stockfish/src';
  const targetDir = 'public';

  // Ensure target directory exists
  await mkdir(targetDir, { recursive: true });

  // Copy Stockfish 17 Lite Single-threaded files
  await copyFile(
    join(sourceDir, 'stockfish-17.1-lite-single-03e3232.js'),
    join(targetDir, 'stockfish.js')
  );
  await copyFile(
    join(sourceDir, 'stockfish-17.1-lite-single-03e3232.wasm'),
    join(targetDir, 'stockfish.wasm')
  );

  console.log('✓ Stockfish 17 Lite files copied successfully');
}

copyStockfishFiles().catch((error) => {
  console.error('Failed to copy Stockfish files:', error);
  process.exit(1);
});
