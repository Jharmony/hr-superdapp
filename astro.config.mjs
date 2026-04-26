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
    /**
     * Pre-bundle Three/R3F stack so `astro dev` does not constantly re-hash `node_modules/.vite/deps/*`.
     * Without this, browsers often hit **504 Outdated Optimize Dep** on `three-stdlib.js` after a cold
     * restart or dep change, which breaks island hydration (e.g. CyberWorldApp).
     */
    optimizeDeps: {
      include: [
        'three',
        'three-stdlib',
        '@react-three/fiber',
        '@react-three/drei',
        'meshline',
      ],
    },
    ssr: {
      noExternal: ['three-stdlib'],
    },
  },
});