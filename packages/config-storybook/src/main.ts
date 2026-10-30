import type { StorybookConfig } from '@storybook/sveltekit';

const config: StorybookConfig = {
	stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|ts|svelte)'],
	addons: ['@storybook/addon-svelte-csf', '@storybook/addon-docs'],
	framework: {
		name: '@storybook/sveltekit',
		options: {},
	},
	staticDirs: ['../static'],
	// Injected into iframe <head> so fullscreen Pixi stories never show document scrollbars
	previewHead: (head) =>
		`${head}<style>
			html, body, #storybook-root, #root {
				margin: 0 !important;
				padding: 0 !important;
				width: 100% !important;
				height: 100% !important;
				overflow: hidden !important;
			}
			canvas { display: block; }
		</style>`,
	// Tall device viewports (> preview panel height) scroll this wrapper — hide that chrome scrollbar
	managerHead: (head) =>
		`${head}<style>
			#storybook-preview-wrapper {
				overflow: hidden !important;
			}
		</style>`,
};

export default config;
