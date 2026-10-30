<!--
	Dev-only layout overlay. Writes go to the store, never to PIXI objects.
	Edit mode is on by default in dev (backtick or the shell's Edit/Play button toggles it).
	Drag snaps in design-frame pixels (centre, edges, safe area, other items, 8px grid; each can be
	switched off in the layer panel). Alt skips snap, Shift while dragging locks to one axis,
	Shift+click adds to the selection. Locked, hidden and follow items are not picked.
-->
<script lang="ts">
	import * as PIXI from 'pixi.js';
	import { onMount } from 'svelte';
	import { Container, Graphics, getContextApp, getContextParent } from 'pixi-svelte';
	import { getContextLayout } from 'utils-layout';

	import { createHistory } from './editor/history';
	import type { EditorPanel } from './editor/panel';
	import { editorState, onCommand, select, setMode, toggleSelected } from './editor/state.svelte';
	import type { Box } from './layout/guards';
	import { cellRect, gridBounds } from './layout/grid';
	import { isFlagged } from './layout/layers';
	import { centreDelta, constrainAxis, nudgeDelta, snapDrag } from './layout/snap';
	import { layoutRegistry } from './registry';
	import {
		activeViewport,
		clearNodeProps,
		currentFindings,
		layoutStore,
		readControlBar,
		readSafeArea,
		readViewportItem,
		replaceBuilderData,
		resetControlBar,
		saveLayout,
		setControlBarValue,
		setGridValue,
		setItemProps,
		setViewportOverride,
		setWriteScope,
		snapshotBuilderData,
	} from './store.svelte';
	import { readGrid, resolveNodeProps } from './useLayout.svelte';

	const OVERLAY_LABEL = '__layout-editor__';
	const TWEAKPANE_KEY = 'layout-editor:tweakpane';

	const appContext = getContextApp();
	const layoutContext = getContextLayout();
	const parentContext = getContextParent();

	const enabled = $derived(editorState.mode === 'edit');
	let tick = $state(0);
	let panel: EditorPanel | undefined;

	const selectedIds = () => editorState.selected;
	const selectedId = $derived(editorState.selected[0] ?? null);
	const app = () => appContext.stateApp.pixiApplication;

	const history = createHistory({
		snapshot: snapshotBuilderData,
		restore: (data) => replaceBuilderData(data, layoutStore.hashes, { keepSaved: true }),
	});

	const isShown = (node: PIXI.Container) => {
		for (let current: PIXI.Container | null = node; current; current = current.parent) {
			if (!current.visible || current.alpha <= 0 || current.destroyed) return false;
		}
		return true;
	};

	const findNodes = (id: string): PIXI.Container[] => {
		const stage = app()?.stage;
		if (!stage) return [];
		return stage.getChildrenByLabel(id, true).filter((node) => !node.destroyed && node.parent);
	};

	const primaryNode = (id: string | null) =>
		id ? (findNodes(id).find(isShown) ?? findNodes(id)[0]) : undefined;

	const groupOf = (id: string) => layoutRegistry.nodes.get(id)?.group;
	const follows = (id: string) =>
		layoutRegistry.nodes.get(id)?.follow === true || readViewportItem(activeViewport(), id).follow === true;
	const locked = (id: string) => isFlagged(layoutStore.data.layout.layers?.locked, id, groupOf(id));
	const hidden = (id: string) => isFlagged(layoutStore.data.layout.layers?.hidden, id, groupOf(id));
	/** Can be picked on the canvas and moved. */
	const movable = (id: string) => !follows(id) && !locked(id) && !hidden(id);

	const toGlobal = (event: PointerEvent) => {
		const point = new PIXI.Point();
		app()?.renderer.events.mapPositionToPoint(point, event.clientX, event.clientY);
		return point;
	};

	const designHolder = () => app()?.stage.getChildByLabel('design-frame') ?? null;

	let lastCandidates: string[] = [];
	let cycleIndex = 0;

	const pick = (point: PIXI.PointData): string[] => {
		const hits: { id: string; area: number; child: number }[] = [];
		for (const id of layoutRegistry.nodes.keys()) {
			if (id === OVERLAY_LABEL || !movable(id)) continue;
			for (const node of findNodes(id)) {
				if (!isShown(node)) continue;
				const bounds = node.getBounds();
				if (bounds.width <= 0 || bounds.height <= 0) continue;
				if (bounds.containsPoint(point.x, point.y)) {
					const child = readViewportItem(activeViewport(), id).parent ? 0 : 1;
					hits.push({ id, area: Math.max(1, Math.round(bounds.width * bounds.height)), child });
					break;
				}
			}
		}
		return hits.sort((a, b) => a.area - b.area || a.child - b.child).map((hit) => hit.id);
	};

	type MoveEntry = { id: string; startPos: { x: number; y: number } };
	type Gesture =
		| { kind: 'move'; node: PIXI.Container; startLocal: PIXI.Point; entries: MoveEntry[] }
		| { kind: 'scale'; id: string; origin: PIXI.Point; startDist: number; startScale: number };
	let gesture: Gesture | null = null;

	const nearScaleHandle = (id: string, point: PIXI.PointData) => {
		const node = primaryNode(id);
		if (!node) return false;
		const bounds = node.getBounds();
		return Math.hypot(point.x - bounds.maxX, point.y - bounds.maxY) <= 14;
	};

	const onPointerDown = (event: PointerEvent) => {
		if (!enabled || event.button !== 0) return;
		if (event.target !== app()?.canvas) return;
		const point = toGlobal(event);
		const candidates = pick(point);
		if (candidates.length === 0) {
			if (!event.shiftKey) select([]);
			return;
		}
		if (event.altKey && candidates.join() === lastCandidates.join()) {
			cycleIndex = (cycleIndex + 1) % candidates.length;
		} else {
			cycleIndex = 0;
		}
		lastCandidates = candidates;
		const hit = candidates[cycleIndex] ?? null;
		if (!hit) return;
		if (event.shiftKey) toggleSelected(hit);
		else if (!selectedIds().includes(hit)) select([hit]);
		const node = primaryNode(hit);
		if (!node?.parent) return;
		/** Art with width/height: node.scale is width/texture, so start from the stored scale. */
		const storedScale = (id: string, target: PIXI.Container) => {
			const def = layoutRegistry.nodes.get(id);
			if (def?.editable.includes('width')) {
				const value = resolveNodeProps(id, def.defaults()).scale;
				return typeof value === 'number' ? value : (value?.x ?? 1);
			}
			return target.scale.x || 1;
		};
		if (!event.shiftKey && selectedIds().length === 1 && nearScaleHandle(hit, point)) {
			const origin = node.getGlobalPosition();
			gesture = {
				kind: 'scale',
				id: hit,
				origin,
				startDist: Math.max(8, Math.hypot(point.x - origin.x, point.y - origin.y)),
				startScale: storedScale(hit, node),
			};
			history.begin();
			return;
		}
		const entries: MoveEntry[] = [];
		for (const id of selectedIds()) {
			const current = primaryNode(id);
			if (!current || !movable(id)) continue;
			entries.push({ id, startPos: { x: current.x, y: current.y } });
		}
		if (entries.length === 0) return;
		gesture = { kind: 'move', node, startLocal: node.parent.toLocal(point), entries };
		history.begin();
	};

	const designBox = (holder: PIXI.Container, node: PIXI.Container): Box => {
		const bounds = node.getBounds();
		const min = holder.toLocal({ x: bounds.minX, y: bounds.minY });
		const max = holder.toLocal({ x: bounds.maxX, y: bounds.maxY });
		return {
			x: Math.min(min.x, max.x),
			y: Math.min(min.y, max.y),
			w: Math.abs(max.x - min.x),
			h: Math.abs(max.y - min.y),
		};
	};

	const round = (value: number) => Math.round(value * 10) / 10;

	const onPointerMove = (event: PointerEvent) => {
		if (!enabled) return;
		const point = toGlobal(event);
		if (!gesture) {
			if (event.target === app()?.canvas) editorState.hover = pick(point)[0] ?? null;
			return;
		}
		if (gesture.kind === 'scale') {
			const dist = Math.max(8, Math.hypot(point.x - gesture.origin.x, point.y - gesture.origin.y));
			const scale = Math.round(Math.min(8, Math.max(0.05, gesture.startScale * (dist / gesture.startDist))) * 100) / 100;
			setItemProps(gesture.id, { scale });
			editorState.readout = `${gesture.id} scale ${scale}`;
			return;
		}
		const parent = gesture.node.parent;
		if (!parent) return;
		const local = parent.toLocal(point);
		const primary = gesture.entries[0];
		if (!primary) return;
		let delta = { x: local.x - gesture.startLocal.x, y: local.y - gesture.startLocal.y };
		if (event.shiftKey) delta = constrainAxis(delta);
		const raw = { x: primary.startPos.x + delta.x, y: primary.startPos.y + delta.y };
		let next = raw;
		editorState.guides = {};
		const holder = designHolder();
		const frame = layoutContext?.stateLayoutDerived.mainLayout();
		const snap = editorState.snap;
		if (holder && frame && snap.enabled && !event.altKey) {
			// Snap the dragged item's centre (bounds based, works for any anchor).
			const node = gesture.node;
			const box = designBox(holder, node);
			const nodeNow = parent.toGlobal({ x: node.x, y: node.y });
			const rawGlobal = parent.toGlobal(raw);
			const shift = holder.toLocal(rawGlobal);
			const now = holder.toLocal(nodeNow);
			const centre = { x: box.x + box.w / 2 + (shift.x - now.x), y: box.y + box.h / 2 + (shift.y - now.y) };
			const others: Box[] = [];
			const moving = new Set(gesture.entries.map((entry) => entry.id));
			for (const id of layoutRegistry.nodes.keys()) {
				if (moving.has(id) || hidden(id) || id === 'background') continue;
				const other = primaryNode(id);
				if (!other || !isShown(other)) continue;
				const otherBox = designBox(holder, other);
				if (otherBox.w <= 0 || otherBox.h <= 0) continue;
				others.push(otherBox);
			}
			const snapped = snapDrag(
				centre,
				{ w: frame.width, h: frame.height },
				readSafeArea(activeViewport()),
				others,
				snap.threshold,
				8,
				snap,
			);
			const fix = { x: snapped.x - centre.x, y: snapped.y - centre.y };
			if (event.shiftKey) {
				if (delta.x === 0) fix.x = 0;
				if (delta.y === 0) fix.y = 0;
			}
			const target = parent.toLocal(holder.toGlobal({ x: shift.x + fix.x, y: shift.y + fix.y }));
			next = target;
			editorState.guides = snapped.guides;
		}
		const dx = next.x - primary.startPos.x;
		const dy = next.y - primary.startPos.y;
		for (const entry of gesture.entries) {
			setItemProps(entry.id, { x: round(entry.startPos.x + dx), y: round(entry.startPos.y + dy) });
		}
		const kinds = [editorState.guides.xKind, editorState.guides.yKind].filter(Boolean);
		editorState.readout = `${primary.id} x ${round(primary.startPos.x + dx)} y ${round(primary.startPos.y + dy)}${
			kinds.length ? ` (snap ${kinds.join('/')})` : event.altKey ? ' (free)' : ''
		}`;
	};

	const onPointerUp = () => {
		if (!gesture) return;
		gesture = null;
		editorState.guides = {};
		history.commit();
	};

	const isTyping = (event: KeyboardEvent) =>
		event.target instanceof HTMLElement && !!event.target.closest('input, textarea, select, [contenteditable]');

	const doSave = async () => {
		editorState.status = 'saving…';
		editorState.status = (await saveLayout(['layout', 'ui']))
			? `saved ${new Date().toLocaleTimeString()}`
			: `save failed: ${layoutStore.lastError}`;
	};

	const geometry = () => layoutRegistry.grid;
	const grid = () => {
		const shape = geometry();
		return shape ? readGrid({ pitch: shape.cell, reels: shape.rows.length }) : null;
	};

	const nudgeGrid = (delta: { x: number; y: number }) => {
		const selection = editorState.grid;
		const resolved = grid();
		if (!selection || !resolved) return false;
		if (selection.row === undefined) {
			const reel = resolved.reels[selection.reel] ?? { dx: 0, dy: 0 };
			if (delta.x) setGridValue({ kind: 'reel', reel: selection.reel, axis: 'dx', value: reel.dx + delta.x });
			if (delta.y) setGridValue({ kind: 'reel', reel: selection.reel, axis: 'dy', value: reel.dy + delta.y });
		} else {
			const cell = resolved.cells[`r${selection.reel}c${selection.row}`] ?? { dx: 0, dy: 0 };
			if (delta.x) setGridValue({ kind: 'cell', reel: selection.reel, row: selection.row, axis: 'dx', value: cell.dx + delta.x });
			if (delta.y) setGridValue({ kind: 'cell', reel: selection.reel, row: selection.row, axis: 'dy', value: cell.dy + delta.y });
		}
		return true;
	};

	const onKeyDown = (event: KeyboardEvent) => {
		if (isTyping(event)) return;
		if (event.code === 'Backquote') {
			event.preventDefault();
			setMode(enabled ? 'play' : 'edit');
			return;
		}
		if (!enabled) return;
		const mod = event.ctrlKey || event.metaKey;
		let handled = true;
		if (mod && event.key.toLowerCase() === 'z') {
			if (event.shiftKey) history.redo();
			else history.undo();
		} else if (mod && event.key.toLowerCase() === 'y') {
			history.redo();
		} else if (mod && event.key.toLowerCase() === 's') {
			void doSave();
		} else if (event.key === 'Escape') {
			select([]);
		} else if (event.key.startsWith('Arrow') && (selectedIds().length > 0 || editorState.grid)) {
			const delta = nudgeDelta(event.key, event.shiftKey, mod);
			if (!delta) return;
			history.record(() => {
				if (nudgeGrid(delta)) return;
				for (const id of selectedIds()) {
					const node = primaryNode(id);
					if (!node || !movable(id)) continue;
					setItemProps(id, { x: round(node.x + delta.x), y: round(node.y + delta.y) });
				}
			});
		} else {
			handled = false;
		}
		if (handled) {
			event.preventDefault();
			event.stopPropagation();
		}
	};

	const centreSelection = (axis: 'h' | 'v' | 'both', target: 'frame' | 'safe') => {
		const holder = designHolder();
		const frame = layoutContext?.stateLayoutDerived.mainLayout();
		if (!holder || !frame) return;
		const insets = target === 'safe' ? readSafeArea(activeViewport()) : { top: 0, right: 0, bottom: 0, left: 0 };
		const goal = {
			x: insets.left + (frame.width - insets.left - insets.right) / 2,
			y: insets.top + (frame.height - insets.top - insets.bottom) / 2,
		};
		history.record(() => {
			for (const id of selectedIds()) {
				const node = primaryNode(id);
				if (!node?.parent || !movable(id)) continue;
				const box = designBox(holder, node);
				const delta = centreDelta(box, goal, axis);
				const from = node.parent.toLocal(holder.toGlobal({ x: 0, y: 0 }));
				const to = node.parent.toLocal(holder.toGlobal(delta));
				setItemProps(id, { x: round(node.x + to.x - from.x), y: round(node.y + to.y - from.y) });
			}
		});
	};

	$effect(() => {
		const pixi = app();
		if (!pixi || !enabled) return;
		const features = pixi.renderer.events.features;
		const saved = { ...features };
		Object.assign(features, { click: false, move: false, globalMove: false, wheel: false });
		pixi.canvas.style.cursor = 'crosshair';
		return () => {
			Object.assign(features, saved);
			pixi.canvas.style.cursor = '';
		};
	});

	const syncPanel = () => {
		if (!panel) return;
		const node = primaryNode(selectedId);
		const key = activeViewport();
		const stored = selectedId ? layoutStore.data.layout.viewports[key].items[selectedId] : undefined;
		const band = readControlBar(key) ?? 0;
		const reds = currentFindings().filter((finding) => finding.level === 'red').length;
		panel.sync({
			viewport: key,
			override: layoutStore.viewportOverride,
			writeScope: layoutStore.writeScope,
			band,
			selectedId,
			instances: selectedId ? findNodes(selectedId).length : 0,
			values: node ? { x: node.x, y: node.y, scale: node.scale.x, visible: node.visible } : undefined,
			overriddenKeys: stored ? Object.keys(stored).map((prop) => `${prop} [${key}]`) : [],
			status: [
				selectedIds().length > 1 ? `${selectedIds().length} selected` : '',
				reds ? `${reds} red (export blocked)` : '',
				layoutStore.dirty ? '● unsaved changes' : '',
				editorState.status,
			]
				.filter(Boolean)
				.join('  '),
		});
	};

	const drawBox = (graphics: PIXI.Graphics, node: PIXI.Container, color: number, handle = true) => {
		const bounds = node.getBounds();
		graphics.rect(bounds.minX, bounds.minY, bounds.width, bounds.height).stroke({ color, width: 1.5 });
		if (!handle) return;
		const origin = node.getGlobalPosition();
		graphics
			.moveTo(origin.x - 6, origin.y)
			.lineTo(origin.x + 6, origin.y)
			.moveTo(origin.x, origin.y - 6)
			.lineTo(origin.x, origin.y + 6)
			.stroke({ color, width: 1 });
		graphics.rect(bounds.maxX - 5, bounds.maxY - 5, 8, 8).fill({ color });
	};

	const framePoly = (graphics: PIXI.Graphics, holder: PIXI.Container, x0: number, y0: number, x1: number, y1: number) => [
		holder.toGlobal({ x: x0, y: y0 }),
		holder.toGlobal({ x: x1, y: y0 }),
		holder.toGlobal({ x: x1, y: y1 }),
		holder.toGlobal({ x: x0, y: y1 }),
	];

	const drawBand = (graphics: PIXI.Graphics) => {
		const frame = layoutContext?.stateLayoutDerived.mainLayout();
		const holder = designHolder();
		if (!frame || !holder) return;
		const band = readControlBar(activeViewport()) ?? 0;
		const points = framePoly(graphics, holder, 0, frame.height - band, frame.width, frame.height);
		graphics.poly(points, true).fill({ color: 0xe23d2b, alpha: 0.18 });
		graphics.poly(points, true).stroke({ color: 0xe23d2b, width: 1, alpha: 0.8 });
	};

	const drawSafe = (graphics: PIXI.Graphics) => {
		const frame = layoutContext?.stateLayoutDerived.mainLayout();
		const holder = designHolder();
		if (!frame || !holder) return;
		const insets = readSafeArea(activeViewport());
		const points = framePoly(graphics, holder, insets.left, insets.top, frame.width - insets.right, frame.height - insets.bottom);
		graphics.poly(points, true).stroke({ color: 0xf5c542, width: 1, alpha: 0.9 });
	};

	const drawGrid = (graphics: PIXI.Graphics) => {
		const frame = layoutContext?.stateLayoutDerived.mainLayout();
		const holder = designHolder();
		if (!frame || !holder) return;
		for (let x = 0; x <= frame.width; x += 8) {
			const a = holder.toGlobal({ x, y: 0 });
			const b = holder.toGlobal({ x, y: frame.height });
			graphics.moveTo(a.x, a.y).lineTo(b.x, b.y);
		}
		for (let y = 0; y <= frame.height; y += 8) {
			const a = holder.toGlobal({ x: 0, y });
			const b = holder.toGlobal({ x: frame.width, y });
			graphics.moveTo(a.x, a.y).lineTo(b.x, b.y);
		}
		graphics.stroke({ color: 0xffffff, width: 1, alpha: 0.12 });
	};

	const drawGuides = (graphics: PIXI.Graphics) => {
		const frame = layoutContext?.stateLayoutDerived.mainLayout();
		const holder = designHolder();
		if (!frame || !holder) return;
		const guides = editorState.guides;
		if (guides.x !== undefined) {
			const a = holder.toGlobal({ x: guides.x, y: 0 });
			const b = holder.toGlobal({ x: guides.x, y: frame.height });
			graphics.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ color: 0x3dffb0, width: 1.5 });
		}
		if (guides.y !== undefined) {
			const a = holder.toGlobal({ x: 0, y: guides.y });
			const b = holder.toGlobal({ x: frame.width, y: guides.y });
			graphics.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ color: 0x3dffb0, width: 1.5 });
		}
	};

	/** Board-space rectangles (grid cells, reel columns) drawn through the board container's transform. */
	const boardRect = (graphics: PIXI.Graphics, board: PIXI.Container, rect: { x: number; y: number; width: number; height: number }) =>
		[
			board.toGlobal({ x: rect.x, y: rect.y }),
			board.toGlobal({ x: rect.x + rect.width, y: rect.y }),
			board.toGlobal({ x: rect.x + rect.width, y: rect.y + rect.height }),
			board.toGlobal({ x: rect.x, y: rect.y + rect.height }),
		];

	const drawGridSelection = (graphics: PIXI.Graphics) => {
		const shape = geometry();
		const resolved = grid();
		const board = primaryNode('board');
		if (!shape || !resolved || !board) return;
		const boardSelected = selectedIds().includes('board') || editorState.grid;
		if (!boardSelected) return;
		shape.rows.forEach((rows, reel) => {
			for (let row = 0; row < rows; row += 1) {
				const rect = cellRect(resolved, shape, reel, row);
				const picked =
					editorState.grid?.reel === reel && (editorState.grid.row === undefined || editorState.grid.row === row);
				graphics.poly(boardRect(graphics, board, rect), true).stroke({
					color: picked ? 0xff3dd2 : 0x00e5ff,
					width: picked ? 2.5 : 1,
					alpha: picked ? 1 : 0.55,
				});
			}
		});
		const bounds = gridBounds(resolved, shape);
		graphics.poly(boardRect(graphics, board, bounds), true).stroke({ color: 0x00e5ff, width: 1, alpha: 0.35 });
	};

	const isRed = (id: string) =>
		currentFindings().some(
			(finding) => finding.level === 'red' && finding.id === id && finding.viewport === activeViewport(),
		);

	const drawOverlay = (graphics: PIXI.Graphics) => {
		void tick;
		void layoutStore.overlays.band;
		void layoutStore.overlays.safe;
		void layoutStore.overlays.grid;
		void editorState.guides;
		void editorState.selected;
		void editorState.grid;
		if (!enabled) return;
		if (layoutStore.overlays.grid) drawGrid(graphics);
		if (layoutStore.overlays.band) drawBand(graphics);
		if (layoutStore.overlays.safe) drawSafe(graphics);
		drawGuides(graphics);
		const hoverId = editorState.hover;
		const hovered = hoverId && !selectedIds().includes(hoverId) ? primaryNode(hoverId) : undefined;
		if (hovered && isShown(hovered)) drawBox(graphics, hovered, 0xffffff, false);
		for (const id of selectedIds()) {
			const nodes = findNodes(id).filter(isShown);
			// Many instances (e.g. the two board containers) draw one box each; the handle only on the first.
			nodes.forEach((node, index) => drawBox(graphics, node, isRed(id) ? 0xe23d2b : locked(id) ? 0x9aa0a6 : 0x00e5ff, index === 0));
		}
		drawGridSelection(graphics);
	};

	onMount(() => {
		const pixi = app();
		if (!pixi) return;
		if (parentContext.parent !== pixi.stage) {
			console.warn('[layout-editor] mount <LayoutEditorMount/> directly inside <App>.');
		}
		let frames = 0;
		const onTick = () => {
			if (!enabled) return;
			tick += 1;
			if (++frames % 6 === 0) syncPanel();
		};
		pixi.ticker.add(onTick);
		const canvas = pixi.canvas;
		canvas.addEventListener('pointerdown', onPointerDown);
		window.addEventListener('pointermove', onPointerMove);
		window.addEventListener('pointerup', onPointerUp);
		window.addEventListener('keydown', onKeyDown, { capture: true });
		const offCommand = onCommand((command) => {
			if (command.type === 'centre') centreSelection(command.axis, command.target);
			else if (command.type === 'save') void doSave();
			else if (command.type === 'undo') history.undo();
			else if (command.type === 'redo') history.redo();
			else if (command.type === 'record') history.record(command.run);
		});

		let disposed = false;
		// Step drag-layers: the DOM layer panel replaces the Tweakpane panel. It is still there for
		// anyone who wants it: sessionStorage.setItem('layout-editor:tweakpane', '1') and reload.
		if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(TWEAKPANE_KEY) === '1') {
			void import('./editor/panel').then(async ({ createEditorPanel }) => {
				const created = await createEditorPanel({
					onSelect: (id) => select(id ? [id] : []),
					onNodeChange: (patch, last) => {
						history.begin();
						if (selectedId) setItemProps(selectedId, patch);
						if (last) history.commit();
					},
					onResetNode: () => {
						if (selectedId) history.record(() => clearNodeProps(selectedId));
					},
					onScopeChange: (scope) => setWriteScope(scope),
					onViewport: (key) => setViewportOverride(key),
					onBandChange: (value, last) => {
						history.begin();
						setControlBarValue(activeViewport(), value);
						if (last) history.commit();
					},
					onBandReset: () => history.record(() => resetControlBar(activeViewport())),
					onUndo: () => history.undo(),
					onRedo: () => history.redo(),
					onSave: () => void doSave(),
				});
				if (disposed) {
					created.dispose();
					return;
				}
				panel = created;
				panel.setHidden(!enabled);
				syncPanel();
			});
		}

		return () => {
			disposed = true;
			offCommand();
			pixi.ticker.remove(onTick);
			canvas.removeEventListener('pointerdown', onPointerDown);
			window.removeEventListener('pointermove', onPointerMove);
			window.removeEventListener('pointerup', onPointerUp);
			window.removeEventListener('keydown', onKeyDown, { capture: true });
			panel?.dispose();
			panel = undefined;
		};
	});
</script>

<Container label={OVERLAY_LABEL} zIndex={1_000_000} eventMode="none" visible={enabled}>
	<Graphics draw={drawOverlay} />
</Container>
