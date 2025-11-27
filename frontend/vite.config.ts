import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from 'vite-plugin-pwa';
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";



const escapeRegex = (value: string) =>
  value.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");

const projectRoot = dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiBaseUrl = env.VITE_API_BASE_URL || "http://localhost:8000";
  const apiOrigin = new URL(apiBaseUrl).origin;
  const mediaOrigin = env.VITE_MEDIA_BASE_URL
    ? new URL(env.VITE_MEDIA_BASE_URL).origin
    : apiOrigin;

  const apiPattern = new RegExp(`^${escapeRegex(apiOrigin)}\\/api\\/.*`, "i");
  const mediaPattern = new RegExp(
    `^${escapeRegex(mediaOrigin)}\\/media\\/.*`,
    "i",
  );

  const enablePwaInBuild = env.VITE_ENABLE_PWA_BUILD === "false";
  const shouldEnablePwa = mode !== "production" || enablePwaInBuild;

  const pwaPlugin = shouldEnablePwa
    ? VitePWA({
        injectRegister: null,
        registerType: "autoUpdate",
        includeAssets: [
          "/media/1ELITE0LOGO.svg",
          "/media/ELITE1-LOGO-transparent.png",
          "/media/ELITE1-LOGO-black.png",
        ],
        manifest: {
          name: "ELITE 1 ACADEMY",
          short_name: "ELITE 1",
          description: "ELITE 1 ACADEMY sports analytics platform",
          theme_color: "#121212",
          background_color: "#000000",
          display: "standalone",
          orientation: "portrait",
          scope: "/",
          start_url: "/",
          icons: [
            {
              src: "/media/ELITE1-LOGO-black.png",
              sizes: "192x192",
              type: "image/png",
              purpose: "any",
            },
            {
              src: "/media/ELITE1-LOGO-black.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "any",
            },
            {
              src: "/media/ELITE1-LOGO-black.png",
              sizes: "192x192",
              type: "image/png",
              purpose: "maskable",
            },
            {
              src: "/media/ELITE1-LOGO-black.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable",
            },
            {
              src: "/media/ELITE1-LOGO-black.png",
              sizes: "180x180",
              type: "image/png",
              purpose: "any",
            },
          ],
        },
        workbox: {
          runtimeCaching: [
            {
              urlPattern: apiPattern,
              handler: "NetworkFirst",
              options: {
                cacheName: "api-cache",
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: mediaPattern,
              handler: "CacheFirst",
              options: {
                cacheName: "image-cache",
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 60 * 24 * 30,
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: "CacheFirst",
              options: {
                cacheName: "google-fonts-cache",
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: "CacheFirst",
              options: {
                cacheName: "google-fonts-cache",
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
              },
            },
          ],
        },
        devOptions: {
          enabled: mode !== "production",
          type: "module",
          suppressWarnings: true,
        },
      })
    : null;

  return {
    plugins: [react(), ...(pwaPlugin ? [pwaPlugin] : [])],
    resolve: {
      alias: shouldEnablePwa
        ? {}
        : [
            { find: /^virtual:pwa-register\/react$/, replacement: resolve(projectRoot, "src/lib/pwa-register-stub.ts") },
            { find: /^virtual:pwa-register$/, replacement: resolve(projectRoot, "src/lib/pwa-register-stub.ts") },
          ],
    },
    server: {
      port: 5173,
      proxy: {
        "/api": {
          target: apiBaseUrl,
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: "dist",
      sourcemap: false,
      target: "es2015",
      minify: "terser",
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks: {
            "vendor-react": ["react", "react-dom", "react/jsx-runtime"],
            "vendor-router": ["react-router-dom"],
            "vendor-state": ["@tanstack/react-query", "zustand"],
            "vendor-ui": ["@headlessui/react"],
          },
          chunkFileNames: "assets/[name]-[hash].js",
          entryFileNames: "assets/[name]-[hash].js",
          assetFileNames: "assets/[name]-[hash].[ext]",
        },
      },
    },
    define: {
      "process.env": {},
    },
    css: {
      devSourcemap: false,
    },
    esbuild: {
      sourcemap: false,
    },
  };
});
