import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        entry: 'electron/main.js',
      },
      {
        entry: 'electron/preload.js',
        onstart(options) {
          options.reload();
        },
      },
    ]),
  ],
  publicDir: 'public',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  base: './',
  build: {
    // Use relative paths for assets
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        // Use IIFE format instead of ES modules to avoid CORS issues in Electron
        format: 'iife',
        inlineDynamicImports: true,
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]'
      }
    }
  },
  server: {
    port: 5173,
  },
});
