import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

const gamePage = fileURLToPath(new URL('./index.html', import.meta.url));
const labPage = fileURLToPath(new URL('./lab/index.html', import.meta.url));

// Relative base so the built asset URLs resolve correctly whether the game is
// served from the domain root or from a GitHub Pages project subpath. This also
// keeps both HTML entry points portable as a single static build.
// (https://<user>.github.io/mimimo-land/).
export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      input: {
        game: gamePage,
        lab: labPage,
      },
    },
  },
});
