import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// Vite config for the React renderer
export default defineConfig({
  root: path.resolve(__dirname, 'renderer'),
  plugins: [react()],
  build: {
    outDir: path.resolve(__dirname, 'dist'),
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  css: {
    // Use the root-level PostCSS config
    postcss: path.resolve(__dirname, 'postcss.config.cjs'),
  }
})

