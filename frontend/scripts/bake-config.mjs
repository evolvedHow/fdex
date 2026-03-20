/**
 * Prebuild script: merges config/config.yml + config/maps.yml + MAPBOX_TOKEN
 * into frontend/public/config.json for the static frontend to fetch.
 *
 * Token resolution order:
 *   1. MAPBOX_TOKEN environment variable (set in shell or GitHub Actions secret)
 *   2. MAPBOX_TOKEN in project root .env file
 *
 * Edit config/config.yml to change map settings.
 * Edit config/maps.yml to change district plans, overlays, and tilesets.
 * Set MAPBOX_TOKEN in .env (locally) or as a GitHub Actions secret.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root      = resolve(__dirname, '../..');
const publicDir = resolve(__dirname, '../public');

// Load .env from repo root (simple parser — no external dep needed)
function loadDotEnv(envPath) {
  try {
    for (const line of readFileSync(envPath, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '').trim();
      }
    }
  } catch { /* .env is optional */ }
}
loadDotEnv(resolve(root, '.env'));

const mapboxToken = process.env.MAPBOX_TOKEN ?? '';
if (!mapboxToken) {
  console.warn('⚠  MAPBOX_TOKEN not set — set it in .env or as an env var');
}

const config = yaml.load(readFileSync(resolve(root, 'config/config.yml'), 'utf8'));
const maps   = yaml.load(readFileSync(resolve(root, 'config/maps.yml'),   'utf8'));

const out = {
  mapboxToken,
  map:           config.map,
  tilesets:      maps.tilesets,
  districtPlans: maps.districtPlans,
  overlays:      maps.overlays,
  boundaries:    maps.boundaries,
};

mkdirSync(publicDir, { recursive: true });
writeFileSync(resolve(publicDir, 'config.json'), JSON.stringify(out, null, 2));
console.log('✓ config.json baked');
