import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    port: 8080,
    host: '0.0.0.0',
    allowedHosts: true,
  },
  build: {
    outDir: '2in1 WEBSITE',
    emptyOutDir: true,
    assetsDir: 'assets',
    rollupOptions: {
      input: {
        index: 'index.html',
      },
    },
  },
})
