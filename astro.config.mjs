// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import vercel from '@astrojs/vercel';

// https://astro.build/config
export default defineConfig({
  // Astro v6: `output: "static"` supports server-rendered routes when using an adapter.
  output: 'static',
  adapter: vercel(),
  integrations: [react()],

  /** Hide the floating Astro dev toolbar in the browser during `astro dev`. */
  devToolbar: {
    enabled: false,
  },

  vite: {
    plugins: [tailwindcss()],
  },
});