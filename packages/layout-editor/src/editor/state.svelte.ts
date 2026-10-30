/**
 * Dev-only editor UI state shared by the PIXI overlay and the DOM layer panel.
 * Imported only from EditorOverlay.svelte and BuilderShell.svelte (both dynamic, DEV-gated),
 * so none of this reaches a production bundle.
 */
import type { SnapGuides } from '../layout/snap';

export type EditorMode = 'edit' | 'play';
export type GridSelection = { reel: number; row?: number } | null;

const MODE_KEY = 'layout-editor:mode';

const initialMode = (): EditorMode => {
	if (typeof sessionStorage === 'undefined') return 'edit';
	return sessionStorage.getItem(MODE_KEY) === 'play' ? 'play' : 'edit';
};

export const editorState = $state({
	/** Edit = canvas clicks pick and drag items. Play = the game gets every click. Default edit in dev. */
	mode: initialMode(),
	selected: [] as string[],
	/** Reel or cell picked inside the Grid group (board item). */
	grid: null as GridSelection,
	hover: null as string | null,
	snap: { enabled: true, centre: true, edges: true, safe: true, items: true, grid: true, threshold: 6 },
	guides: {} as SnapGuides,
	/** Last drag/nudge readout, e.g. "board x 711 y 360 (snap centre)". */
	readout: '',
	status: '',
});

export function setMode(mode: EditorMode) {
	editorState.mode = mode;
	if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(MODE_KEY, mode);
	if (mode === 'play') {
		editorState.hover = null;
		editorState.guides = {};
	}
}

export function select(ids: string[], grid: GridSelection = null) {
	editorState.selected = [...new Set(ids)];
	editorState.grid = grid;
}

export function toggleSelected(id: string) {
	editorState.selected = editorState.selected.includes(id)
		? editorState.selected.filter((entry) => entry !== id)
		: [...editorState.selected, id];
	editorState.grid = null;
}

export type EditorCommand =
	| { type: 'centre'; axis: 'h' | 'v' | 'both'; target: 'frame' | 'safe' }
	| { type: 'save' }
	| { type: 'undo' }
	| { type: 'redo' }
	| { type: 'record'; run: () => void };

type Handler = (command: EditorCommand) => void;
const handlers = new Set<Handler>();

/** Panel → overlay commands that need PIXI bounds (centre buttons) or the overlay's undo history. */
export function sendCommand(command: EditorCommand) {
	if (handlers.size === 0 && command.type === 'record') command.run();
	handlers.forEach((handler) => handler(command));
}

export function onCommand(handler: Handler) {
	handlers.add(handler);
	return () => handlers.delete(handler);
}
