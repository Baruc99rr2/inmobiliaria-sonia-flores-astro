// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import vercel from '@astrojs/vercel';

// https://astro.build/config
export default defineConfig({
  // 🚀 AGREGA ESTA LÍNEA CON TU URL DE VERCEL
  site: 'https://inmobiliaria-sonia-flores-astro.vercel.app',

  integrations: [react()],

  vite: {
    plugins: [tailwindcss()]
  },

  adapter: vercel()
});