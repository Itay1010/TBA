import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path';

export default defineConfig(({ command, mode }) => {
  const isDev = mode == 'development'
  const devAPIProxy = {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true, // Needed for virtual hosted sites
        secure: false,      // Set to false if using self-signed SSL certificates
      }
    }
  }
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
            // Use default hashing for all other JS files (like React components)
            return assetInfo.name === 'sw' ? 'sw.js' : 'assets/[name]-[hash].js';
          }
        }
      }
    },
    server: isDev ? devAPIProxy : null
  }
});
