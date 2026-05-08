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
        sw: path.resolve(import.meta.dirname, 'src/sw.ts')
      },
      output: {
        entryFileNames: (assetInfo) => {
          if (assetInfo.name === 'sw') {
            return 'sw.js';
          }
          // Use default hashing for all other JS files (like your React components)
          return 'assets/[name]-[hash].js';
        }
      }
    }
  }
})
