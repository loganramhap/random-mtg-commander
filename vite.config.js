import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  },
  // GitHub Pages configuration
  base: process.env.NODE_ENV === 'production' ? '/random-mtg-commander/' : '/'
});