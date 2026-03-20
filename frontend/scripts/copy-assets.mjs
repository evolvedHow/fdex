/**
 * Postbuild script: copies data/ and img/ from the repo root into dist/
 * so GitHub Pages serves them alongside the compiled frontend.
 *
 * GeoJSON files and demographics JSON live in data/.
 * Logos and icons live in img/.
 */
import { cpSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '../..');
const dist = resolve(root, 'dist');

function copy(src, dest) {
  if (!existsSync(src)) {
    console.warn(`⚠  Skipping ${src} (not found)`);
    return;
  }
  cpSync(src, dest, { recursive: true });
  console.log(`✓ Copied ${src.replace(root, '')} → dist/`);
}

copy(resolve(root, 'data'), resolve(dist, 'data'));
copy(resolve(root, 'img'),  resolve(dist, 'img'));
