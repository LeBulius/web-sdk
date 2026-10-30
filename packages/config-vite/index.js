// Don't convert this to a ts file, because of this https://github.com/vitejs/vite/issues/5370
import { sveltekit } from '@sveltejs/kit/vite';
import { lingui } from '@lingui/vite-plugin';
import { defineConfig } from 'vite';

const NODE_ENV = process.env.NODE_ENV;
let dev = NODE_ENV === 'development';

export default () =>
	defineConfig({
		plugins: [sveltekit(), lingui()],
		logLevel: 'info',
		build: {
			assetsInlineLimit: Infinity,
			sourcemap: dev ? true : false,
			output: {
				sourcemap: dev ? true : false,
			},
		},
		css: {
			preprocessorOptions: {
				scss: {
					// 'modern' instead of 'modern-compiler': Vite 6.2.0's preprocessCSS (used by svelte's
					// vitePreprocess for <style lang="scss">) starts a long-lived sass-embedded compiler
					// that is never disposed, so `vite build` never exits. 'modern' compiles per call.
					api: 'modern',
				},
			},
		},
	});
