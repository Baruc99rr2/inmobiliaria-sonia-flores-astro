// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import vercel from '@astrojs/vercel';

// https://astro.build/config
export default defineConfig({
  // Dominio canónico del sitio. Va CON www: la versión sin www responde 308
  // redirigiendo acá, así que usarla generaría canónicas y og:url que apuntan
  // a una URL que redirige.
  site: 'https://www.inmobiliariasoniaflores.com',

  integrations: [react()],

  vite: {
    plugins: [tailwindcss()]
  },

  adapter: vercel()
});