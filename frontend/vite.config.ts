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
