import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path';

export default defineConfig(({ command, mode }) => {

  return {
    base: './',
    plugins: [
      react()
    ],
    build: {
      rollupOptions: {
        input: {
          main: path.resolve(import.meta.dirname, 'index.html'),
          sw: './sw.ts',
        },
        output: {
          entryFileNames: (assetInfo) => {
            // Use default hashing for all other JS files (like your React components)
            return assetInfo.name === 'sw' ? 'sw.js' : 'assets/[name]-[hash].js';
          }
        }
      }
    }
  };
});
