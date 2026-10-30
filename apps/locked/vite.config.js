// @ts-ignore
import config from 'config-vite';
// layout-editor (visual builder): relative import on purpose, a package import of the plugin
// fails (vitejs/vite#5370). The plugin only adds dev middleware (/__layout, /__upload, /dev/*).
import { layoutEditorPlugin } from '../../packages/layout-editor/src/vite-plugin-layout';

const base = config();
base.plugins.push(layoutEditorPlugin({ file: 'src/game/builder.json' }));
// INTEGRATION.md asks for build.assetsInlineLimit = 0 here. Not applied: this game ships as one
// inline bundle (config-svelte bundleStrategy 'inline' + config-vite assetsInlineLimit Infinity),
// and emitted asset files resolve to /assets/... from the inline script and 404 (black screen).

export default base;
