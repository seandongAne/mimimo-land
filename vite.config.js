import { defineConfig } from 'vite';

// Relative base so the built asset URLs resolve correctly whether the game is
// served from the domain root or from a GitHub Pages project subpath
// (https://<user>.github.io/mimimo-land/).
export default defineConfig({
  base: './',
});
