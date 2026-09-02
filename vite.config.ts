import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import basicSsl from '@vitejs/plugin-basic-ssl';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isHttps = process.env.HTTPS === 'true' || mode === 'https';
  const isProduction = mode === 'production';

  return {
    base: isProduction ? '/Gujarati-Video-Dubber/' : '/',
    plugins: [
      react(),
      ...(isHttps ? [basicSsl()] : []),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'icons/*.png'],
        manifest: {
          name: 'Gujarati Dub Studio',
          short_name: 'GujDubStudio',
          description: 'Mobile-first PWA to record Gujarati videos and dub into Hindi or English',
          theme_color: '#0f172a',
          background_color: '#090d16',
          display: 'standalone',
          orientation: 'portrait-primary',
          start_url: './',
          scope: './',
          icons: [
            {
              src: 'icons/icon-192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: 'icons/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
            },
            {
              src: 'icons/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
      }),
    ],
    server: {
      port: 5173,
      host: true,
      https: isHttps,
    },
  };
});
