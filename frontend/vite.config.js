import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@services': path.resolve(__dirname, './src/services'),
      '@context': path.resolve(__dirname, './src/context'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@pages': path.resolve(__dirname, './src/pages'),
    },
  },

  build: {
    target: 'es2020',
    sourcemap: false,
    minify: 'esbuild',
    chunkSizeWarningLimit: 600,

    rollupOptions: {
      output: {
        // Split vendor libraries into named chunks
        manualChunks(id) {
          // React core — always needed
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'react-core';
          }
          // Router
          if (id.includes('node_modules/react-router')) {
            return 'router';
          }
          // TanStack Query
          if (id.includes('node_modules/@tanstack')) {
            return 'tanstack-query';
          }
          // Charts
          if (id.includes('node_modules/recharts') || id.includes('node_modules/d3')) {
            return 'charts';
          }
          // Three.js (heavy 3D lib — own chunk)
          if (id.includes('node_modules/three') || id.includes('node_modules/@react-three')) {
            return 'three';
          }
          // Socket.IO
          if (id.includes('node_modules/socket.io')) {
            return 'socket';
          }
          // Remaining node_modules → shared vendor
          if (id.includes('node_modules')) {
            return 'vendor';
          }

          // App modules — split by portal
          if (id.includes('/components/admin/') || id.includes('/pages/admin')) return 'portal-admin';
          if (id.includes('/components/hr/') || id.includes('/pages/hr')) return 'portal-hr';
          if (id.includes('/components/manager/') || id.includes('/pages/manager')) return 'portal-manager';
          if (id.includes('/components/employee/') || id.includes('/pages/employee')) return 'portal-employee';
          if (id.includes('/components/ceo/') || id.includes('/pages/ceo')) return 'portal-ceo';
          if (id.includes('/components/law/') || id.includes('/pages/law')) return 'portal-law';
          if (id.includes('/components/finance/') || id.includes('/pages/finance')) return 'portal-finance';
          if (id.includes('/components/it/') || id.includes('/pages/it')) return 'portal-it';
          if (id.includes('/components/outsourcing/') || id.includes('/features/outsourcing')) return 'portal-outsourcing';
          if (id.includes('/components/media/') || id.includes('/components/sales/')) return 'portal-misc';
        },
        // Consistent hashed file names for long-term caching
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
      },
    },
  },

  // Dev server optimizations
  server: {
    warmup: {
      clientFiles: ['./src/main.jsx', './src/App.jsx', './src/routes/AppRoutes.jsx'],
    },
  },

  // Pre-bundle heavy deps for faster dev startup
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-query',
      'recharts',
    ],
    exclude: ['three', '@react-three/fiber', '@react-three/drei'],
  },
});
