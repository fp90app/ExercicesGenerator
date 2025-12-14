import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// 1. Import du plugin PWA
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    // 2. Configuration de la PWA
    VitePWA({
      registerType: 'autoUpdate', // Mise à jour auto dès qu'il y a du nouveau code
      // 👇 AJOUTE CETTE LIGNE ICI (Autorise jusqu'à 10 Mo)
      workbox: {
        maximumFileSizeToCacheInBytes: 10000000
      },
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'Maths Signoret',
        short_name: 'Maths Signoret',
        description: 'Application d\'entraînement aux mathématiques - Collège Simone Signoret',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone', // Cache la barre d'adresse du navigateur
        orientation: 'portrait',
        icons: [
          {
            src: 'pwa-192x192.png', // On va créer ces images juste après
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable' // Pour les icônes rondes (Android)
          }
        ]
      }
    })
  ],
})