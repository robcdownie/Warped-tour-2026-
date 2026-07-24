import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath } from 'node:url';

// GitHub Pages project site is served from /Warped-tour-2026-/
const BASE = '/Warped-tour-2026-/';

export default defineConfig({
  base: BASE,
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: null, // we register manually in src/pwa.ts
      includeAssets: [
        'icons/apple-touch-icon-180.png',
        'icons/favicon.svg',
        'map/festival-map.webp',
      ],
      manifest: {
        id: '/Warped-tour-2026-/',
        name: 'Warped Long Beach Companion',
        short_name: 'Warped LB',
        description:
          'Unofficial personal companion for Vans Warped Tour Long Beach 2026. Works offline.',
        start_url: '/Warped-tour-2026-/',
        scope: '/Warped-tour-2026-/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0b2f6b',
        theme_color: '#0b2f6b',
        categories: ['music', 'lifestyle', 'travel'],
        icons: [
          { src: 'icons/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/pwa-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Precache the entire built app shell + all static assets (js/css/html/img/fonts).
        globPatterns: ['**/*.{js,css,html,webp,png,svg,woff,woff2,ico,json}'],
        // The festival map is large; make sure it is precached.
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api/, /\/[^/?]+\.[^/]+$/],
        clientsClaim: true,
        skipWaiting: false,
        runtimeCaching: [
          {
            // Any same-origin GET we didn't precache: serve cache-first with network fallback.
            urlPattern: ({ sameOrigin }) => sameOrigin,
            handler: 'CacheFirst',
            options: {
              cacheName: 'wlb-runtime',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 90 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: {
        enabled: false, // SW only in production build (avoids dev caching headaches)
      },
    }),
  ],
  build: {
    target: 'es2022',
    sourcemap: false,
  },
});
