/**
 * Tweakpane side panel. Imported dynamically by the overlay so it stays out of
 * production bundles. The Control-bar band binding lives in the Editor folder.
 */
import { VIEWPORT_KEYS, type ViewportKey } from '../builder.schema';
import { layoutRegistry } from '../registry';
import type { NodeProps } from '../layout.schema';

export type WriteScope = 'key' | 'all';

export type PanelNodeValues = {
	x: number;
	y: number;
	scale: number;
	visible: boolean;
};

export type PanelSyncState = {
	viewport: ViewportKey;
	override: ViewportKey | null;
	writeScope: WriteScope;
	band: number;
	selectedId: string | null;
	instances: number;
	values?: PanelNodeValues;
	overriddenKeys: string[];
	status: string;
};

export type EditorPanelCallbacks = {
	onSelect: (id: string | null) => void;
	onNodeChange: (patch: NodeProps, last: boolean) => void;
	onResetNode: () => void;
	onScopeChange: (scope: WriteScope) => void;
	onViewport: (key: ViewportKey | null) => void;
	onBandChange: (value: number, last: boolean) => void;
	onBandReset: () => void;
	onUndo: () => void;
	onRedo: () => void;
	onSave: () => void;
};

/**
 * tweakpane 4.0.5 publishes types that import `@tweakpane/core`, which is not
 * in the npm tarball. The runtime bundle has these methods. This is the slice we use.
 */
type BindingApi = {
	on(event: 'change', handler: (ev: { value: never; last: boolean }) => void): void;
};

type ButtonApi = {
	on(event: 'click', handler: () => void): void;
};

type FolderLike = {
	children: unknown[];
	remove(child: unknown): void;
	addBinding(object: object, key: string, params?: object): BindingApi;
	addButton(params: { title: string }): ButtonApi;
};

type PaneLike = FolderLike & {
	element: HTMLElement;
	hidden: boolean;
	addFolder(params: { title: string }): FolderLike;
	refresh(): void;
	dispose(): void;
};

const viewportOptions: Record<string, string> = { '(follow window)': '' };
for (const key of VIEWPORT_KEYS) viewportOptions[key] = key;

export async function createEditorPanel(callbacks: EditorPanelCallbacks) {
	const { Pane } = await import('tweakpane');
	const pane = new Pane({ title: 'Layout editor  ( ` to toggle )', expanded: true }) as unknown as PaneLike;
	pane.element.parentElement?.style.setProperty('z-index', '10000');

	let syncing = false;
	let interacting = false;

	const status = { viewport: '', info: '' };
	const editor = {
		scope: 'key' as WriteScope,
		viewport: '',
		controlBar: 110,
	};
	const selection = { node: '' };
	const node: PanelNodeValues = { x: 0, y: 0, scale: 1, visible: true };

	const guard =
		<T>(fn: (value: T, last: boolean) => void) =>
		(event: { value: T; last: boolean }) => {
			if (syncing) return;
			interacting = !event.last;
			fn(event.value, event.last);
		};

	const editorFolder = pane.addFolder({ title: 'Editor' });
	editorFolder.addBinding(status, 'viewport', { readonly: true, label: 'active viewport' });
	editorFolder
		.addBinding(editor, 'scope', {
			label: 'write to',
			options: { 'this size': 'key', 'All sizes': 'all' },
		})
		.on('change', guard<WriteScope>((value) => callbacks.onScopeChange(value)));
	editorFolder
		.addBinding(editor, 'viewport', {
			label: 'size',
			options: viewportOptions,
		})
		.on(
			'change',
			guard<string>((value) => {
				callbacks.onViewport(value ? (value as ViewportKey) : null);
			}),
		);
	editorFolder
		// Step C: the shared band is edited in the UI tab (ui.json). Here it is this game's
		// explicit uiOverride, clamped so it can only grow.
		.addBinding(editor, 'controlBar', { label: 'Band (game override)', min: 0, max: 400, step: 1 })
		.on('change', guard<number>((value, last) => callbacks.onBandChange(value, last)));
	editorFolder.addButton({ title: 'Reset band to shared ui.json' }).on('click', () => callbacks.onBandReset());
	editorFolder.addButton({ title: 'Undo (Ctrl+Z)' }).on('click', () => callbacks.onUndo());
	editorFolder.addButton({ title: 'Redo (Ctrl+Shift+Z)' }).on('click', () => callbacks.onRedo());
	editorFolder.addButton({ title: 'Save (Ctrl+S)' }).on('click', () => callbacks.onSave());
	editorFolder.addBinding(status, 'info', { readonly: true, multiline: true, rows: 4, label: 'status' });

	const nodeFolder = pane.addFolder({ title: 'Node' });

	const clearFolder = (folder: FolderLike) => {
		[...folder.children].forEach((child) => folder.remove(child));
	};

	const buildNodeFolder = () => {
		clearFolder(nodeFolder);
		const ids = [...layoutRegistry.nodes.keys()].sort();
		nodeFolder
			.addBinding(selection, 'node', {
				label: 'node',
				options: { '(none)': '', ...Object.fromEntries(ids.map((id) => [id, id])) },
			})
			.on('change', guard<string>((value) => callbacks.onSelect(value || null)));
		if (!selection.node) return;
		nodeFolder
			.addBinding(node, 'x', { step: 1 })
			.on('change', guard<number>((x, last) => callbacks.onNodeChange({ x }, last)));
		nodeFolder
			.addBinding(node, 'y', { step: 1 })
			.on('change', guard<number>((y, last) => callbacks.onNodeChange({ y }, last)));
		nodeFolder
			.addBinding(node, 'scale', { min: 0.05, max: 5, step: 0.01 })
			.on('change', guard<number>((scale, last) => callbacks.onNodeChange({ scale }, last)));
		nodeFolder
			.addBinding(node, 'visible')
			.on('change', guard<boolean>((visible) => callbacks.onNodeChange({ visible }, true)));
		nodeFolder.addButton({ title: 'Reset item to inherited' }).on('click', () => callbacks.onResetNode());
	};

	buildNodeFolder();
	const unsubscribe = layoutRegistry.subscribe(() => {
		if (interacting) return;
		buildNodeFolder();
	});

	let lastSelected: string | null = null;

	return {
		setHidden(hidden: boolean) {
			pane.hidden = hidden;
		},
		sync(state: PanelSyncState) {
			if (interacting) return;
			syncing = true;
			try {
				status.viewport = state.viewport;
				editor.scope = state.writeScope;
				editor.viewport = state.override ?? '';
				editor.controlBar = state.band;
				status.info = [
					state.selectedId
						? `${state.selectedId}: ${state.instances} mounted`
						: 'click a node (Alt+click cycles overlaps)',
					state.overriddenKeys.length ? `overrides: ${state.overriddenKeys.join(', ')}` : 'no overrides',
					state.status,
				]
					.filter(Boolean)
					.join('\n');
				if (state.selectedId !== lastSelected) {
					lastSelected = state.selectedId;
					selection.node = state.selectedId ?? '';
					buildNodeFolder();
				}
				if (state.values) Object.assign(node, state.values);
				pane.refresh();
			} finally {
				syncing = false;
			}
		},
		dispose() {
			unsubscribe();
			pane.dispose();
		},
	};
}

export type EditorPanel = Awaited<ReturnType<typeof createEditorPanel>>;
