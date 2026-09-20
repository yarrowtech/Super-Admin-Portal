import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Vendor grouping for long-lived browser caching: each group changes rarely, so its
// hashed file stays cached across app deploys. Matching is on the top-level package
// name (path-separator agnostic) taken from the module id.
const vendorGroups = {
  'vendor-react': ['react', 'react-dom', 'scheduler', 'react-router', 'react-router-dom'],
  'vendor-query': ['@tanstack'],
  'vendor-socket': ['socket.io-client', 'socket.io-parser', 'engine.io-client', 'engine.io-parser', '@socket.io'],
  'vendor-charts': ['recharts', 'victory-vendor', 'internmap', 'decimal.js-light', 'es-toolkit', '@reduxjs', 'react-redux', 'redux', 'redux-thunk', 'reselect', 'immer', 'use-sync-external-store'],
  'vendor-editor': ['@tiptap', 'orderedmap', 'rope-sequence', 'w3c-keyname', 'linkifyjs', 'tippy.js', '@popperjs', 'markdown-it', 'entities', 'mdurl', 'uc.micro', 'linkify-it', 'punycode.js', 'crelt', '@remirror'],
  'vendor-dnd': ['@dnd-kit'],
}
const prefixGroups = [['vendor-charts', 'd3-'], ['vendor-editor', 'prosemirror-']]

const packageOf = (id) => {
  const parts = id.split('node_modules')
  if (parts.length < 2) return null
  const segs = parts[parts.length - 1].split(/[\\/]/).filter(Boolean)
  return segs[0] || null
}

const lookup = new Map(Object.entries(vendorGroups).flatMap(([chunk, pkgs]) => pkgs.map((p) => [p, chunk])))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const pkg = packageOf(id)
          if (!pkg) return undefined
          if (lookup.has(pkg)) return lookup.get(pkg)
          const hit = prefixGroups.find(([, prefix]) => pkg.startsWith(prefix))
          return hit ? hit[0] : undefined
        },
      },
    },
  },
})
