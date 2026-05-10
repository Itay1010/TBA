import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path';

export default defineConfig({
  base: './',
  plugins: [
    react()
  ],
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(import.meta.dirname, 'index.html'),
        sw: {
          
        }
      },
      output: {
        entryFileNames: (assetInfo) => {
          // Use default hashing for all other JS files (like your React components)
          return assetInfo.name === 'sw' ? 'sw.js' : 'assets/[name]-[hash].js';
        }
      }
    }
  }
})
