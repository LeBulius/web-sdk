/**
 * Registry of editable layout nodes and tunables.
 *
 * Populated at runtime by useLayout()/resolveLayout()/defineTunable(), read by the dev overlay.
 *
 * Deliberately NOT Svelte state: resolveLayout() and tunable getters are called from inside
 * $derived / template expressions (e.g. stateGameDerived.boardLayout()), and mutating $state
 * there throws `state_unsafe_mutation` in Svelte 5. Instead this is a plain Map with a
 * microtask-batched subscribe() that the (imperative, Tweakpane based) overlay listens to.
 *
 * Production cost: a couple of Map writes per node; nothing subscribes.
 */
import type { NodeProps, NodePropKey } from './layout.schema';
import type { GridGeometry } from './layout/grid';

/**
 * Which rectangle (in the node's PARENT local space) is used for snapping guides.
 * - 'main'         : stateLayoutDerived.mainLayout() width/height (nodes inside <MainContainer>)
 * - 'mainStandard' : stateLayoutDerived.mainLayoutStandard() (nodes inside <MainContainer standard>, e.g. the HUD)
 * - 'canvas'       : stateLayoutDerived.canvasSizes() (nodes placed directly on the stage)
 * - 'none'         : no frame guides (grid snapping only)
 * - {width,height} : explicit rectangle, e.g. the board size for nodes nested inside the board
 */
export type FrameSpec =
	| 'main'
	| 'mainStandard'
	| 'canvas'
	| 'none'
	| { width: number; height: number };

export type NodeDefinition = {
	id: string;
	/** Latest formula defaults (the value the code would use without layout.json). */
	defaults: () => NodeProps;
	frame: FrameSpec;
	/** Props shown in the panel / draggable via handles. */
	editable: NodePropKey[];
	description?: string;
	/** 'component' = useLayout() (ref-counted by mount), 'state' = resolveLayout() (module scope). */
	source: 'component' | 'state';
	/** Number of currently mounted useLayout() instances (always 0 for 'state'). */
	mounted: number;
	/** Layer panel group (see layout/layers.ts). Undefined = "Other". */
	group?: string;
	/** Shown in the layer panel instead of the id. */
	name?: string;
	/** Positioned by another item (e.g. symbols by the grid): selectable in the panel, never dragged. */
	follow?: boolean;
	/** Where stored x/y land: 'offset' = added to the formula position (wrappers). Informational. */
	mode?: 'absolute' | 'offset';
};

export type TunableDefinition = {
	id: string;
	default: number;
	min?: number;
	max?: number;
	step?: number;
	/**
	 * true = the value is captured at module init somewhere (e.g. SYMBOL_SIZE passed to
	 * createReelForCascading({ symbolHeight })) so the page must reload to see a change.
	 * The Vite plugin does NOT do this automatically; the panel shows a "reload required" hint.
	 */
	reload?: boolean;
	description?: string;
};

export type RegisterNodeOptions = {
	frame?: FrameSpec;
	editable?: NodePropKey[];
	description?: string;
	group?: string;
	name?: string;
	follow?: boolean;
	mode?: 'absolute' | 'offset';
};

export const DEFAULT_EDITABLE: NodePropKey[] = ['x', 'y', 'scale', 'rotation', 'alpha', 'visible'];

type Listener = () => void;

function createRegistry() {
	const nodes = new Map<string, NodeDefinition>();
	const tunables = new Map<string, TunableDefinition>();
	/** Every prop key that was ever overridden for a node this session (see NEUTRAL_PROPS). */
	const touchedKeys = new Map<string, Set<NodePropKey>>();
	const listeners = new Set<Listener>();
	let notifyQueued = false;
	let gridGeometry: GridGeometry | null = null;
	let layerDefaults: Record<string, readonly string[]> = {};

	const notify = () => {
		if (notifyQueued || listeners.size === 0) return;
		notifyQueued = true;
		queueMicrotask(() => {
			notifyQueued = false;
			listeners.forEach((listener) => listener());
		});
	};

	const upsertNode = (
		id: string,
		defaults: () => NodeProps,
		source: NodeDefinition['source'],
		options: RegisterNodeOptions = {},
	) => {
		const existing = nodes.get(id);
		const definition: NodeDefinition = {
			id,
			defaults,
			source,
			frame: options.frame ?? existing?.frame ?? 'main',
			editable: options.editable ?? existing?.editable ?? DEFAULT_EDITABLE,
			description: options.description ?? existing?.description,
			mounted: existing?.mounted ?? 0,
			group: options.group ?? existing?.group,
			name: options.name ?? existing?.name,
			follow: options.follow ?? existing?.follow,
			mode: options.mode ?? existing?.mode,
		};
		const changed =
			!existing ||
			existing.frame !== definition.frame ||
			existing.source !== definition.source ||
			existing.group !== definition.group ||
			existing.editable.join() !== definition.editable.join();
		nodes.set(id, definition);
		if (changed) notify();
		return definition;
	};

	return {
		nodes: nodes as ReadonlyMap<string, NodeDefinition>,
		tunables: tunables as ReadonlyMap<string, TunableDefinition>,

		/** useLayout(): ref-counted, call release() on component destroy. */
		mountNode(id: string, defaults: () => NodeProps, options?: RegisterNodeOptions) {
			const definition = upsertNode(id, defaults, 'component', options);
			definition.mounted += 1;
			notify();
			return () => {
				const current = nodes.get(id);
				if (current) current.mounted = Math.max(0, current.mounted - 1);
				notify();
			};
		},

		/** resolveLayout(): idempotent, safe to call from $derived / templates. */
		defineNode(id: string, defaults: () => NodeProps, options?: RegisterNodeOptions) {
			const existing = nodes.get(id);
			if (existing && existing.source === 'state') {
				existing.defaults = defaults; // keep latest closure, no notify needed
				return existing;
			}
			return upsertNode(id, defaults, 'state', options);
		},

		defineTunable(definition: TunableDefinition) {
			const existing = tunables.get(definition.id);
			tunables.set(definition.id, definition);
			if (!existing) notify();
			return definition;
		},

		markTouched(id: string, keys: Iterable<NodePropKey>) {
			const set = touchedKeys.get(id) ?? new Set<NodePropKey>();
			for (const key of keys) set.add(key);
			touchedKeys.set(id, set);
		},

		getTouched(id: string): ReadonlySet<NodePropKey> | undefined {
			return touchedKeys.get(id);
		},

		/** The game's reel grid shape (cell size + rows per reel). Read by the overlay and the Grid inspector. */
		defineGrid(geometry: GridGeometry) {
			const changed = JSON.stringify(gridGeometry) !== JSON.stringify(geometry);
			gridGeometry = geometry;
			if (changed) notify();
		},
		get grid(): GridGeometry | null {
			return gridGeometry;
		},

		/** Default item order per layer group, bottom to top (the game's render order). */
		defineLayerDefaults(defaults: Record<string, readonly string[]>) {
			const changed = JSON.stringify(layerDefaults) !== JSON.stringify(defaults);
			layerDefaults = defaults;
			if (changed) notify();
		},
		get layerDefaults(): Record<string, readonly string[]> {
			return layerDefaults;
		},

		subscribe(listener: Listener) {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
	};
}

export const layoutRegistry = createRegistry();
export type LayoutRegistry = typeof layoutRegistry;
