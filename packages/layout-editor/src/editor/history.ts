/**
 * Undo/redo. Snapshot based: one gesture = one undo step.
 * Generic so it stores a builder file, not the starter's layout.json.
 */
export function createHistory<T>({
	snapshot,
	restore,
	limit = 200,
}: {
	snapshot: () => T;
	restore: (data: T) => void;
	limit?: number;
}) {
	const undoStack: string[] = [];
	const redoStack: string[] = [];
	let pending: string | null = null;

	const serialize = () => JSON.stringify(snapshot());

	const api = {
		begin() {
			if (pending === null) pending = serialize();
		},
		commit() {
			if (pending === null) return;
			const now = serialize();
			if (now !== pending) {
				undoStack.push(pending);
				if (undoStack.length > limit) undoStack.shift();
				redoStack.length = 0;
			}
			pending = null;
		},
		record(mutate: () => void) {
			api.begin();
			mutate();
			api.commit();
		},
		undo() {
			api.commit();
			const previous = undoStack.pop();
			if (previous === undefined) return false;
			redoStack.push(serialize());
			restore(JSON.parse(previous) as T);
			return true;
		},
		redo() {
			api.commit();
			const next = redoStack.pop();
			if (next === undefined) return false;
			undoStack.push(serialize());
			restore(JSON.parse(next) as T);
			return true;
		},
		get canUndo() {
			return undoStack.length > 0;
		},
		get canRedo() {
			return redoStack.length > 0;
		},
	};
	return api;
}

export type EditorHistory = ReturnType<typeof createHistory>;
