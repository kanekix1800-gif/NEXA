import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  /**
   * Caminho base RELATIVO: o build funciona em qualquer subcaminho — por exemplo
   * `https://usuario.github.io/NEXA/` (GitHub Pages) — sem configuração adicional.
   * Combinado com o roteamento por hash, links diretos e recarregamentos nunca geram 404.
   */
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    /**
     * PWA: torna o NEXA instalável ("Adicionar à tela inicial") e mantém a interface
     * disponível mesmo com conexão instável. Os dados já ficam no próprio dispositivo.
     */
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'NEXA — Conexões que transformam realidades',
        short_name: 'NEXA',
        description:
          'Plataforma que conecta moradores, comércio local, instituições e poder público.',
        lang: 'pt-BR',
        dir: 'ltr',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#064d3b',
        background_color: '#faf5ec',
        start_url: './',
        scope: './',
        categories: ['social', 'lifestyle', 'business'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        runtimeCaching: [
          {
            // Blocos do mapa (OpenStreetMap): reaproveita o que já foi visto.
            urlPattern: /^https:\/\/[abc]\.tile\.openstreetmap\.org\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'nexa-mapa',
              expiration: { maxEntries: 400, maxAgeSeconds: 60 * 60 * 24 * 14 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    // Usa os aliases declarados em tsconfig.app.json ("@/..." → "src/...").
    tsconfigPaths: true,
  },
  server: {
    port: 5173,
  },
  preview: {
    port: 4173,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'server/**/*.test.ts'],
    css: false,
    restoreMocks: true,
  },
})
