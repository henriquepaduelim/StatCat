import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // Workbox's internal bundler crashes under Node 22 when minifying the SW.
      // Force the PWA plugin to run in "development" mode so it skips the Terser step.
      mode: 'development',
      minify: false,
      registerType: 'autoUpdate',
      includeAssets: ['/media/Asset 1ELITE0LOGO.svg', '/media/ELITE1-LOGO-transparent.png'],
      manifest: {
        name: 'ELITE 1 ACADEMY',
        short_name: 'ELITE 1',
        description: 'ELITE 1 ACADEMY sports analytics platform',
        theme_color: '#121212',
        background_color: '#000000',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/media/ELITE1-LOGO-transparent.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/media/ELITE1-LOGO-transparent.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/media/ELITE1-LOGO-transparent.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: '/media/ELITE1-LOGO-transparent.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: '/media/ELITE1-LOGO-transparent.png',
            sizes: '180x180',
            type: 'image/png',
            purpose: 'any'
          }
        ]
      },
      workbox: {
        // Disable precache manifest generation while we rely on runtime caching only.
        globPatterns: [],
        runtimeCaching: [
          {
            // Cache API calls with Network First strategy
            urlPattern: /^https:\/\/statscat\.onrender\.com\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 // 24 hours
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            // Cache images with Cache First strategy
            urlPattern: /^https:\/\/statscat\.onrender\.com\/media\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              }
            }
          },
          {
            // Cache Google Fonts
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              }
            }
          },
          {
            // Cache Google Fonts stylesheets
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              }
            }
          }
        ]
      },
      devOptions: {
        enabled: true,
        type: 'module',
        suppressWarnings: true
      }
    })
  ],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: false,
    target: 'es2015',
    minify: 'esbuild',
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          // Keep React and React-DOM together to prevent issues
          'vendor-react': ['react', 'react-dom', 'react/jsx-runtime'],
          // Router
          'vendor-router': ['react-router-dom'],
          // State management
          'vendor-state': ['@tanstack/react-query', 'zustand'],
          // UI libraries
          'vendor-ui': ['@headlessui/react'],
        },
        // Optimize chunk file naming
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },
  define: {
    'process.env': {}
  },
  // Disable all source maps to prevent errors
  css: {
    devSourcemap: false,
  },
  esbuild: {
    sourcemap: false,
  },
});