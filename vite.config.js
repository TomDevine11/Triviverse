import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:3002',
    },
  },
  // The canonical data-integrity tests iterate large generated datasets and can exceed
  // vitest's default 5s timeout on slower CI runners — give them headroom so CI isn't flaky.
  test: {
    testTimeout: 30000,
    hookTimeout: 30000,
  },
})
