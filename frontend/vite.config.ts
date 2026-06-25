import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg', 'logo-cropped.svg'],
      manifest: {
        name: 'Spesade',
        short_name: 'Spesade',
        description: 'Gestione ordini e inventario aziendale',
        theme_color: '#080d16',
        background_color: '#080d16',
        display: 'standalone',
        icons: [
          {
            src: 'logo-cropped.svg',
            sizes: '192x192 512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      }
    }
  }
})
