import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	resolve: {
		alias: {
			// Julius's packages/utils-sound is his own sound system and has no './player' export.
			// phase6 tests the visual-builder's Howler player stand-in, vendored here for the tests only.
			'utils-sound/player': fileURLToPath(new URL('./test/support/howl-player.ts', import.meta.url)),
		},
	},
	test: {
		environment: 'node',
		include: ['test/**/*.test.ts'],
		testTimeout: 30000,
		hookTimeout: 30000,
	},
});
