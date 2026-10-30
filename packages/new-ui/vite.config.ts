import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'url';

const dir = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
	plugins: [sveltekit()],
	resolve: {
		alias: {
			'state-shared': fileURLToPath(new URL('../state-shared/index.ts', import.meta.url)),
			'utils-event-emitter': fileURLToPath(new URL('../utils-event-emitter/index.ts', import.meta.url)),
			'utils-bet': fileURLToPath(new URL('../utils-bet/index.ts', import.meta.url)),
		}
	}
});
