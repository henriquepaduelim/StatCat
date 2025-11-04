import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
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
    target: 'esnext',
    minify: 'esbuild',
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Separate node_modules into vendor chunks
          if (id.includes('node_modules')) {
            // React core
            if (id.includes('react') || id.includes('react-dom') || id.includes('scheduler')) {
              return 'vendor-react';
            }
            // Router
            if (id.includes('react-router')) {
              return 'vendor-router';
            }
            // State management and queries
            if (id.includes('@tanstack/react-query') || id.includes('zustand')) {
              return 'vendor-state';
            }
            // UI libraries
            if (id.includes('@headlessui') || id.includes('@tremor')) {
              return 'vendor-ui';
            }
            // Icons
            if (id.includes('@fortawesome')) {
              return 'vendor-icons';
            }
            // Other vendors
            return 'vendor-misc';
          }
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
