import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'On The Clock',
        short_name: 'On The Clock',
        description: 'Draft a team. Get graded. Crown a champion.',
        theme_color: '#0a2540',
        background_color: '#0a2540',
        display: 'standalone',
        orientation: 'any',
        icons: [],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})
