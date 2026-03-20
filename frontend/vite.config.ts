import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';
import { createReadStream, existsSync } from 'fs';
import type { IncomingMessage, ServerResponse } from 'http';

const root = resolve(__dirname, '..');

// Dev-only middleware: serves ../data/ and ../img/ at /data/ and /img/
// In production these are copied to dist/ by scripts/copy-assets.mjs
function serveLocalAssets() {
  return {
    name: 'serve-local-assets',
    configureServer(server: any) {
      server.middlewares.use((req: IncomingMessage, res: ServerResponse, next: () => void) => {
        const url = req.url ?? '';
        let localPath: string | null = null;

        if (url.startsWith('/data/')) {
          localPath = resolve(root, url.slice(1));
        } else if (url.startsWith('/img/')) {
          localPath = resolve(root, url.slice(1));
        }

        if (localPath && existsSync(localPath)) {
          const ext = localPath.split('.').pop() ?? '';
          const mime: Record<string, string> = {
            json: 'application/json',
            geojson: 'application/json',
            png: 'image/png',
            svg: 'image/svg+xml',
            jpg: 'image/jpeg',
            jpeg: 'image/jpeg',
          };
          res.setHeader('Content-Type', mime[ext] ?? 'application/octet-stream');
          createReadStream(localPath).pipe(res);
          return;
        }

        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [svelte(), tailwindcss(), serveLocalAssets()],

  // BASE_PATH is set by GitHub Actions to /repo-name/
  // Leave unset (or set to '/') for local dev and preview
  base: process.env.BASE_PATH ?? '/',

  server: {
    port: 5173,
  },

  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
});
