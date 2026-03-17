import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [svelte(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8000',
      '/data': 'http://localhost:8000',
      '/img': 'http://localhost:8000',
    },
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
});
