import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    port: 8082,
    host: '0.0.0.0',
    allowedHosts: true,
  },
  build: {
    outDir: 'staff-dist',
    assetsDir: 'assets',
    rollupOptions: {
      input: 'staff.html',
    },
  },
})
