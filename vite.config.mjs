import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  root: path.resolve(__dirname, 'src'),
  base: './',
  publicDir: path.resolve(__dirname, 'public'),
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, 'shared'),
    },
  },
  build: {
    outDir: path.resolve(__dirname, 'dist'),
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});
