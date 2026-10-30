// Runtime API (ships to production). The Vite plugin is not exported here:
// it imports node:fs and must be loaded from vite.config.js by relative path.
export {
	VIEWPORT_KEYS,
	VIEWPORTS,
	MOBILE_LANDSCAPE_KEYS,
	ORIENTATION_TWIN,
	ancestorChain,
	isMobileKey,
	isMobileLandscapeKey,
	normalizeBuilderFile,
	viewportFamily,
	assetPathError,
	controlBarBand,
	emptyBuilderFile,
	letterbox,
	pickViewport,
	resolveActiveViewport,
	resolveTunable,
	resolveViewportItem,
	screenToDesign,
	serializeBuilderFile,
	sortBuilderFile,
	validateBuilderFile,
	validateLayoutSection,
	canonicalSection,
	resolveGrid,
	designLayoutType,
	CELL_NUDGE_MAX,
} from './src/builder.schema';
export type {
	BuilderFile,
	BuilderSection,
	ControlBarMap,
	LayoutItem,
	LayoutSection,
	Pin,
	PointerKind,
	GameUiSection,
	ViewportFamily,
	ViewportKey,
	GridLayout,
	ResolvedGrid,
	LayerConfig,
} from './src/builder.schema';

export {
	activeSafeArea,
	activeUi,
	activeViewport,
	adoptUpload,
	currentFindings,
	pointerKind,
	readSafeArea,
	saveUi,
	setPreviewInsets,
	setSharedBand,
	setUiPreviewHead,
	bindAudioCue,
	bindSpineEvent,
	bindViewport,
	clearNodeProps,
	layoutStore,
	copyLayoutFrom,
	readControlBar,
	readFrameLayout,
	readTunable,
	readViewportItem,
	replaceBuilderData,
	resetControlBar,
	saveLayout,
	setArtAnchor,
	setAudioMix,
	setControlBarValue,
	setLocale,
	setNodeProps,
	setItemProps,
	setGridValue,
	resetGrid,
	setLayers,
	isUiItem,
	setOverlay,
	setPreviewMood,
	setViewportOverride,
	setWriteScope,
	snapshotBuilderData,
} from './src/store.svelte';

export {
	defineGrid,
	defineLayers,
	defineTunable,
	layerGroupVisible,
	layerGroupZ,
	layerItemZ,
	readGrid,
	resolveLayout,
	tunable,
	useLayout,
	useUiItem,
} from './src/useLayout.svelte';
export type { UiItemProps } from './src/useLayout.svelte';
export { cellCenterX, cellRect, gridBounds, gridY, offsetRows, reelLeft, reelTop } from './src/layout/grid';
export type { GridGeometry } from './src/layout/grid';
export { ABOVE_LAYERS_Z, DEFAULT_GROUP_IDS, groupOrder, itemOrder, mergeOrder, moveInOrder } from './src/layout/layers';
export { LAYER_GROUPS, type LayerGroupDef } from './src/editor/layer-groups';
export { BOARD_FRAME_LAYOUT, DESIGN_FRAMES, RENAMED_IDS, applyDragLayersMigration, boardOrigin, titleOrigin } from './src/layout/migrate';
export { LOCALES, messageText } from './src/layout/messages';
export { exportAllowed, formulaFor, inheritsPortrait, layoutFindings, resolveBand, worldOf } from './src/layout/guards';
export { readEnvSafeArea } from './src/layout/safe-area';
export { runGameCheck } from './src/check/game-check';
export { centreDelta, constrainAxis, nudgeDelta, snapDrag } from './src/layout/snap';
export { layoutRegistry } from './src/registry';
export {
	asAudioSection,
	audioFindings,
	channelGain,
	createCueLog,
	musicForMode,
	peakWarning,
	playRoundCues,
	scheduleBookCues,
	sizeWarning,
} from './src/audio/plan';
export { onBookEvent } from './src/events/play-book';
export {
	applyVisualEvent,
	dispatchSpineBindings,
	listVisualItems,
	resolveVisual,
	spineFindings,
} from './src/spine/adapter';
export type { ResolvedVisual, VisualEventResult } from './src/spine/adapter';
export { default as LayoutEditorMount } from './src/LayoutEditorMount.svelte';
export { default as BuilderShellMount } from './src/BuilderShellMount.svelte';
