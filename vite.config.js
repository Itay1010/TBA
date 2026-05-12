import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path';

export default defineConfig(({ command, mode }) => {
  const baseConfig = {
    base: './',
    plugins: [
      react()
    ],
  };

  const buildOptions = mode === 'development'
    ? {} // No build options needed for development, rely on dev server defaults
    : {
      rollupOptions: {
        input: {
          main: path.resolve(import.meta.dirname, 'index.html')
        },
        output: {
          entryFileNames: (assetInfo) => {
            // Use default hashing for all other JS files (like your React components)
            return assetInfo.name === 'sw' ? 'sw.js' : 'assets/[name]-[hash].js';
          }
        }
      }
    };

  return {
    ...baseConfig,
    build: buildOptions
  };
});
