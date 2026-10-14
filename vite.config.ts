import {earlyThemeScript} from './src/utils/earlyTheme.ts'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    {name: 'sanctra-early-theme', transformIndexHtml: {order: 'pre', handler: html => html.replace('<!-- sanctra:early-theme -->', `<script>${earlyThemeScript()}</script>`) }},
    react(),
    tailwindcss(),
  ],
  build: {
    // Preserve standard backdrop-filter alongside Safari prefixes in shipped CSS.
    cssMinify: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/firebase/firestore') || id.includes('@firebase/firestore')) {
            return 'vendor-firebase-firestore';
          }
          if (id.includes('node_modules/firebase/auth') || id.includes('@firebase/auth')) {
            return 'vendor-firebase-auth';
          }
          if (id.includes('node_modules/firebase/') || id.includes('@firebase/')) {
            return 'vendor-firebase-core';
          }
          if (id.includes('node_modules/lucide-react/')) {
            return 'vendor-icons';
          }
        },
      },
    },
  },
})
