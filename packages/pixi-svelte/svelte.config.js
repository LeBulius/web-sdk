// @ts-ignore
import config from 'config-svelte';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

// svelte-package: InitialiseApplication.svelte has a plain-CSS <style> block. vitePreprocess's style
// step would load this package's vite.config.js (config-vite: sveltekit() + lingui() app plugins),
// which needs src/app.html and a lingui config that a library doesn't have. Plain CSS needs no
// preprocessing (Svelte compiles it), so only TypeScript/script preprocessing is kept.
const base = config();
base.preprocess = vitePreprocess({ style: false });

export default base;
