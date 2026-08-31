/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// TxtHero is a fully client-side editor: no backend, so no proxying is needed.
// `allowedHosts: true` lets the app be served through any proxy host (e.g. a
// sandboxed live-preview URL) instead of only localhost.
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    allowedHosts: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    allowedHosts: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    // CodeMirror measures real layout; jsdom reports zeros, which is fine for
    // asserting document state but would be meaningless for pixel assertions.
    css: false,
  },
})
