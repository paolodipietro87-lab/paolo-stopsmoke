import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { versioneBuild } from './build-version.ts';

// Su GitHub Pages l'app vive sotto /<repo>/: base configurabile senza toccare il codice.
const base = process.env.BASE_PATH ?? '/paolo-stopsmoke/';

export default defineConfig({
  base,
  define: { __APP_VERSION__: JSON.stringify(versioneBuild()) },
  plugins: [
    react(),
    VitePWA({
      // 'prompt', non 'autoUpdate': l'aggiornamento silenzioso arriva solo alla seconda
      // riapertura e senza conferma. Qui il banner lo rende immediato e visibile.
      registerType: 'prompt',
      injectRegister: null, // la registrazione la fa AggiornamentoPwa via virtual:pwa-register/react
      includeAssets: ['icona-192.png', 'icona-512.png', 'icona-maskable-512.png'],
      manifest: {
        name: 'Smoke Timer',
        short_name: 'Smoke Timer',
        description: 'Smetti di fumare per riduzione graduale. Timer, multe, salvadanaio.',
        lang: 'it',
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0e1116',
        theme_color: '#0e1116',
        icons: [
          { src: 'icona-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icona-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icona-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg}'],
        navigateFallback: `${base}index.html`,
      },
    }),
  ],
});
