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
  optimizeDeps: {
    include: ['butterchurn', 'butterchurn-presets'],
    // Force default interop for legacy UMD webpack bundles.
    needsInterop: ['butterchurn', 'butterchurn-presets'],
  },
  build: {
    outDir: path.resolve(__dirname, 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'src/index.html'),
        visualizer: path.resolve(__dirname, 'src/visualizer-window/visualizer.html'),
        vc: path.resolve(__dirname, 'src/vc-window/vc.html'),
      },
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    headers: {
      'Cache-Control': 'no-store',
    },
  },
});
