/** Dev-only layer group names/descriptions for the Layers panel (ids: layout/layers.ts). */
export type LayerGroupDef = { id: string; name: string; description: string };

/** Bottom to top, matching today's Locked In render order. */
export const LAYER_GROUPS: readonly LayerGroupDef[] = [
	{ id: 'background', name: 'Background', description: 'Backdrop art (canvas space)' },
	{ id: 'frame', name: 'Frame', description: 'Board frame art (board space)' },
	{ id: 'grid', name: 'Grid', description: 'Board position, reels and cells (board space)' },
	{ id: 'symbols', name: 'Symbols', description: 'Symbol layers; positioned by the grid' },
	{ id: 'fx', name: 'FX', description: 'Cell effects; follow the grid' },
	{ id: 'overlay', name: 'Game overlay', description: 'Logo, WAYS plaque' },
	{ id: 'ui', name: 'UI (shared)', description: 'Control bar from ui.json; drags save a Locked In-only override' },
];
