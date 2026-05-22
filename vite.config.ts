import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'favicon.svg'],
      manifest: {
        name: 'FaktCRM',
        short_name: 'FaktCRM',
        description: 'Upravljanje fakturama i uplatama',
        theme_color: '#2563eb',
        background_color: '#1e293b',
        display: 'standalone',
        start_url: '/fakture-crm/',
        scope: '/fakture-crm/',
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        cleanupOutdatedCaches: true,
        navigateFallback: '/fakture-crm/index.html',
        navigateFallbackAllowlist: [/^\/fakture-crm/],
      },
    }),
  ],
  base: '/fakture-crm/',
})
