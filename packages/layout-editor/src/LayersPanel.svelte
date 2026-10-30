<!--
	Dev-only Photoshop-style layer panel + inspector (DOM). Part of BuilderShell, so it is dropped
	from production builds with it. Writes go through the store (undo via the overlay's history).
	- Groups: Background, Frame, Grid (board, reels, cells), Symbols, FX, Game overlay, UI (shared).
	- Eye/lock are editor-only (builder.json layout.layers.hidden/locked, applied in dev only).
	- Reorder (▲▼ or drag a row) = render order (layout.layers.groups/order, read by the game).
	- UI items write a Locked In-only ui.uiOverrides offset; the shared ui.json is never touched.
-->
<script lang="ts">
	import { onMount } from 'svelte';

	import { VIEWPORTS, CELL_NUDGE_MAX } from './builder.schema';
	import { editorState, select, sendCommand, setMode, toggleSelected } from './editor/state.svelte';
	import { LAYER_GROUPS } from './editor/layer-groups';
	import { groupOrder, isFlagged, itemOrder, moveBefore, moveInOrder, toggleInList } from './layout/layers';
	import { layoutRegistry, type NodeDefinition } from './registry';
	import {
		activeUi,
		activeViewport,
		clearNodeProps,
		layoutStore,
		readViewportItem,
		resetGrid,
		setGridValue,
		setItemProps,
		setLayers,
		setWriteScope,
	} from './store.svelte';
	import { readGrid, resolveNodeProps } from './useLayout.svelte';
	import type { GridPatch } from './mutate';

	type Props = { top?: number };
	const props: Props = $props();

	let version = $state(0);
	let collapsed = $state<Record<string, boolean>>({ fx: true });
	let openReels = $state<Record<number, boolean>>({});
	let folded = $state(false);
	let dragId = $state<string | null>(null);
	let windowHeight = $state(typeof window === 'undefined' ? 800 : window.innerHeight);

	onMount(() => layoutRegistry.subscribe(() => (version += 1)));
	// The registry is not reactive (see registry.ts); poll lightly so late mounts show up.
	onMount(() => {
		const timer = setInterval(() => (version += 1), 1000);
		return () => clearInterval(timer);
	});

	const key = $derived(activeViewport());
	const layers = $derived(layoutStore.data.layout.layers);
	const nodes = $derived.by(() => {
		void version;
		return new Map(layoutRegistry.nodes);
	});
	const uiIds = $derived(
		Object.keys(activeUi()?.items ?? {}).filter((id) => id !== 'controlBar.band'),
	);
	const groupName = (id: string) => LAYER_GROUPS.find((group) => group.id === id)?.name ?? id;
	const defaultsOf = (group: string): string[] => {
		void version;
		const fromGame = [...(layoutRegistry.layerDefaults[group] ?? [])];
		const extra = [...nodes.values()].filter((def) => def.group === group && !fromGame.includes(def.id)).map((def) => def.id);
		const all = [...fromGame, ...extra];
		if (group === 'ui') for (const id of uiIds) if (!all.includes(id)) all.push(id);
		return all;
	};
	/** Top of the list = drawn on top (Photoshop order). */
	const groups = $derived([...groupOrder(layers)].reverse());
	const itemsOf = (group: string) => [...itemOrder(layers, group, defaultsOf(group))].reverse();

	const isHidden = (id: string, group?: string) => isFlagged(layers?.hidden, id, group);
	const isLocked = (id: string, group?: string) => isFlagged(layers?.locked, id, group);
	const follows = (id: string) => nodes.get(id)?.follow === true || readViewportItem(key, id).follow === true;
	const mounted = (id: string) => {
		const def = nodes.get(id);
		return !!def && (def.source === 'state' || def.mounted > 0);
	};

	const onRowClick = (id: string, event: MouseEvent) => {
		if (event.shiftKey || event.ctrlKey || event.metaKey) toggleSelected(id);
		else select([id]);
	};

	const toggleFlag = (field: 'hidden' | 'locked', id: string) => {
		const on = !isFlagged(layers?.[field], id);
		sendCommand({ type: 'record', run: () =>
				setLayers((next) => {
					next[field] = toggleInList(next[field], id, on);
				}),
		});
	};

	const moveItem = (group: string, id: string, delta: number) => {
		const order = itemOrder(layers, group, defaultsOf(group));
		sendCommand({
			type: 'record',
			run: () =>
				setLayers((next) => {
					const orders = (next.order ??= {});
					orders[group] = moveInOrder(order, id, delta);
				}),
		});
	};

	const moveGroup = (group: string, delta: number) => {
		const order = groupOrder(layers);
		sendCommand({
			type: 'record',
			run: () =>
				setLayers((next) => {
					next.groups = moveInOrder(order, group, delta);
				}),
		});
	};

	const dropOn = (group: string, target: string) => {
		const id = dragId;
		dragId = null;
		if (!id || id === target) return;
		const order = itemOrder(layers, group, defaultsOf(group));
		if (!order.includes(id)) return;
		// Rows are shown top-first, so dropping on a row puts the item just above it in draw order.
		const above = order[order.indexOf(target) + 1] ?? null;
		sendCommand({
			type: 'record',
			run: () =>
				setLayers((next) => {
					const orders = (next.order ??= {});
					orders[group] = moveBefore(order, id, above === id ? null : above);
				}),
		});
	};

	// ---------------------------------------------------------------- inspector
	const primary = $derived(editorState.selected[0] ?? null);
	const def = $derived.by((): NodeDefinition | undefined => {
		void version;
		return primary ? nodes.get(primary) : undefined;
	});
	const isUi = $derived(def?.group === 'ui');
	const values = $derived.by(() => {
		if (!primary || !def) return null;
		if (isUi) {
			const own = layoutStore.data.ui?.uiOverrides?.[primary]?.[key] ?? {};
			return { x: own.dx ?? 0, y: own.dy ?? 0, scale: own.scale ?? 1, visible: own.visible ?? true, width: undefined, height: undefined };
		}
		const resolved = resolveNodeProps(primary, def.defaults());
		const scale = typeof resolved.scale === 'number' ? resolved.scale : (resolved.scale?.x ?? 1);
		return {
			x: resolved.x ?? 0,
			y: resolved.y ?? 0,
			scale,
			visible: resolved.visible ?? true,
			width: resolved.width,
			height: resolved.height,
		};
	});
	const stored = $derived(
		!primary
			? []
			: isUi
				? Object.keys(layoutStore.data.ui?.uiOverrides?.[primary]?.[key] ?? {}).map((field) => `ui.${field}`)
				: Object.keys(layoutStore.data.layout.viewports[key].items[primary] ?? {}),
	);
	const editable = (prop: string) => !!def?.editable.includes(prop as never);
	const num = (event: Event) => Number((event.currentTarget as HTMLInputElement).value);
	const fixed = (value: number | undefined, digits = 1) => (value === undefined ? '' : Number(value.toFixed(digits)));

	const write = (patch: Record<string, number | boolean>) => {
		const id = primary;
		if (!id) return;
		sendCommand({ type: 'record', run: () => setItemProps(id, patch) });
	};

	const shape = $derived.by(() => {
		void version;
		return layoutRegistry.grid;
	});
	const grid = $derived(shape ? readGrid({ pitch: shape.cell, reels: shape.rows.length }) : null);
	const showGrid = $derived(primary === 'board' || editorState.grid !== null);
	const gridWrite = (patch: GridPatch) => sendCommand({ type: 'record', run: () => setGridValue(patch) });
	const selectedCell = $derived(
		editorState.grid && editorState.grid.row !== undefined && grid
			? (grid.cells[`r${editorState.grid.reel}c${editorState.grid.row}`] ?? { dx: 0, dy: 0 })
			: null,
	);

	const snapToggle = (field: 'centre' | 'edges' | 'safe' | 'items' | 'grid') =>
		(editorState.snap[field] = !editorState.snap[field]);
</script>

<svelte:window bind:innerHeight={windowHeight} />
<aside class="layers" class:folded style:top="{Math.min(props.top ?? 0, windowHeight * 0.45)}px" data-testid="layers-panel">
	<div class="bar">
		<button
			type="button"
			class:active={editorState.mode === 'edit'}
			data-testid="mode-toggle"
			title="Edit: click/drag items on the canvas. Play: the game gets every click. Backtick toggles."
			onclick={() => setMode(editorState.mode === 'edit' ? 'play' : 'edit')}
		>
			{editorState.mode === 'edit' ? '✎ Edit' : '▶ Play'}
		</button>
		<button
			type="button"
			class:active={editorState.snap.enabled}
			data-testid="snap-toggle"
			title="Snap (Alt while dragging = free)"
			onclick={() => (editorState.snap.enabled = !editorState.snap.enabled)}>{editorState.snap.enabled ? 'Snap' : 'Free'}</button
		>
		<button type="button" title="Undo (Ctrl+Z)" onclick={() => sendCommand({ type: 'undo' })}>↶</button>
		<button type="button" title="Redo (Ctrl+Shift+Z)" onclick={() => sendCommand({ type: 'redo' })}>↷</button>
		<button type="button" data-testid="layers-save" title="Save builder.json (layout + game ui overrides)" onclick={() => sendCommand({ type: 'save' })}
			>Save{layoutStore.dirty ? ' ●' : ''}</button
		>
		<button type="button" class="fold" data-testid="layers-fold" onclick={() => (folded = !folded)}>{folded ? '◂ Layers' : '▸'}</button>
	</div>
	{#if !folded}
		{#if editorState.snap.enabled}
			<div class="snaps" data-testid="snap-options">
				{#each ['centre', 'edges', 'safe', 'items', 'grid'] as const as field (field)}
					<label><input type="checkbox" checked={editorState.snap[field]} onchange={() => snapToggle(field)} />{field === 'grid' ? '8px' : field}</label>
				{/each}
				<label>±<input class="tiny" type="number" min="1" max="40" value={editorState.snap.threshold} onchange={(event) => (editorState.snap.threshold = num(event))} /></label>
			</div>
		{/if}
		<div class="tree" data-testid="layers-tree">
			{#each groups as group, index (group)}
				{@const gHidden = isHidden(`group:${group}`)}
				{@const gLocked = isLocked(`group:${group}`)}
				<div class="group" data-testid="layer-group-{group}">
					<button type="button" class="caret" onclick={() => (collapsed[group] = !collapsed[group])}>{collapsed[group] ? '▸' : '▾'}</button>
					<button type="button" class="icon" class:off={gHidden} title="Hide in the editor" data-testid="eye-group-{group}" onclick={() => toggleFlag('hidden', `group:${group}`)}>{gHidden ? '◌' : '👁'}</button>
					<button type="button" class="icon" class:on={gLocked} class:unlocked={!gLocked} title="Lock" data-testid="lock-group-{group}" onclick={() => toggleFlag('locked', `group:${group}`)}>{gLocked ? '🔒' : '🔓'}</button>
					<strong>{groupName(group)}</strong>
					<span class="sp"></span>
					<button type="button" class="icon" title="Draw this group higher" disabled={index === 0} onclick={() => moveGroup(group, 1)}>▲</button>
					<button type="button" class="icon" title="Draw this group lower" disabled={index === groups.length - 1} onclick={() => moveGroup(group, -1)}>▼</button>
				</div>
				{#if !collapsed[group]}
					{#each itemsOf(group) as id, itemIndex (id)}
						{@const node = nodes.get(id)}
						{@const sel = editorState.selected.includes(id)}
						<div
							class="item"
							class:selected={sel}
							class:dim={!mounted(id)}
							class:hidden-row={isHidden(id) || gHidden}
							data-testid="layer-{id}"
							draggable="true"
							role="option"
							aria-selected={sel}
							tabindex="0"
							ondragstart={() => (dragId = id)}
							ondragover={(event) => event.preventDefault()}
							ondrop={(event) => {
								event.preventDefault();
								dropOn(group, id);
							}}
							onclick={(event) => onRowClick(id, event)}
							onkeydown={(event) => event.key === 'Enter' && select([id])}
						>
							<button type="button" class="icon" class:off={isHidden(id)} title="Hide in the editor" data-testid="eye-{id}" onclick={(event) => { event.stopPropagation(); toggleFlag('hidden', id); }}>{isHidden(id) ? '◌' : '👁'}</button>
							<button type="button" class="icon" class:on={isLocked(id)} class:unlocked={!isLocked(id)} title="Lock (not picked or moved on the canvas)" data-testid="lock-{id}" onclick={(event) => { event.stopPropagation(); toggleFlag('locked', id); }}>{isLocked(id) ? '🔒' : '🔓'}</button>
							<span class="name">{node?.name ?? id}</span>
							{#if follows(id)}<span class="badge" title="Follows another item (positioned by the grid)">🔗</span>{/if}
							{#if group === 'ui'}<span class="badge" title="Locked In-only override; ui.json untouched">⇄</span>{/if}
							<span class="sp"></span>
							{#if sel}
								<button type="button" class="icon" title="Up (drawn on top)" disabled={itemIndex === 0} onclick={(event) => { event.stopPropagation(); moveItem(group, id, 1); }}>▲</button>
								<button type="button" class="icon" title="Down" onclick={(event) => { event.stopPropagation(); moveItem(group, id, -1); }}>▼</button>
							{/if}
						</div>
						{#if id === 'board' && shape}
							{#each shape.rows as rows, reel (reel)}
								<div
									class="item sub"
									class:selected={editorState.grid?.reel === reel && editorState.grid.row === undefined}
									data-testid="layer-reel-{reel}"
									role="option"
									aria-selected={editorState.grid?.reel === reel}
									tabindex="0"
									onclick={() => select(['board'], { reel })}
									onkeydown={(event) => event.key === 'Enter' && select(['board'], { reel })}
								>
									<button type="button" class="caret" onclick={(event) => { event.stopPropagation(); openReels[reel] = !openReels[reel]; }}>{openReels[reel] ? '▾' : '▸'}</button>
									<span class="name">reel {reel} · {rows} rows</span>
								</div>
								{#if openReels[reel]}
									{#each Array(rows) as _, row (row)}
										<div
											class="item cell"
											class:selected={editorState.grid?.reel === reel && editorState.grid.row === row}
											data-testid="layer-cell-r{reel}c{row}"
											role="option"
											aria-selected={editorState.grid?.reel === reel && editorState.grid.row === row}
											tabindex="0"
											onclick={() => select(['board'], { reel, row })}
											onkeydown={(event) => event.key === 'Enter' && select(['board'], { reel, row })}
										>
											<span class="name">cell r{reel}c{row}</span>
										</div>
									{/each}
								{/if}
							{/each}
						{/if}
					{:else}
						<div class="item dim">(nothing registered)</div>
					{/each}
				{/if}
			{/each}
		</div>

		<div class="inspector" data-testid="inspector">
			{#if primary && values}
				<div class="title">
					<strong data-testid="inspector-id">{def?.name ?? primary}</strong>
					<span>{groupName(def?.group ?? '')} · {key} {VIEWPORTS[key].w}×{VIEWPORTS[key].h}</span>
				</div>
				{#if isUi}
					<p class="note">Locked In-only override (builder.json ui.uiOverrides, dx/dy offset). Shared ui.json is not changed.</p>
				{:else if def?.mode === 'offset'}
					<p class="note">x/y are an offset from the computed position.</p>
				{/if}
				{#if follows(primary)}
					<p class="note">Positioned by the grid (🔗). Edit the Grid instead; eye/lock still work.</p>
				{/if}
				<div class="fields">
					<label>write
						<select value={layoutStore.writeScope} onchange={(event) => setWriteScope((event.currentTarget as HTMLSelectElement).value as 'key' | 'all')}>
							<option value="key">this size ({key})</option>
							<option value="all">all sizes</option>
						</select>
					</label>
				</div>
				{#if !follows(primary)}
					<div class="fields">
						<label>x <input type="number" step="1" data-testid="field-x" value={fixed(values.x)} onchange={(event) => write({ x: num(event) })} /></label>
						<label>y <input type="number" step="1" data-testid="field-y" value={fixed(values.y)} onchange={(event) => write({ y: num(event) })} /></label>
						<label>scale <input type="number" step="0.01" min="0.05" data-testid="field-scale" value={fixed(values.scale, 3)} onchange={(event) => write({ scale: num(event) })} /></label>
						{#if editable('width')}
							<label>w <input type="number" step="1" min="1" data-testid="field-w" value={fixed(values.width)} onchange={(event) => write({ width: num(event) })} /></label>
						{/if}
						{#if editable('height')}
							<label>h <input type="number" step="1" min="1" data-testid="field-h" value={fixed(values.height)} onchange={(event) => write({ height: num(event) })} /></label>
						{/if}
						<label class="check"><input type="checkbox" checked={values.visible} onchange={(event) => write({ visible: (event.currentTarget as HTMLInputElement).checked })} /> in game</label>
					</div>
					<div class="fields">
						<span>centre</span>
						<button type="button" data-testid="centre-h" onclick={() => sendCommand({ type: 'centre', axis: 'h', target: 'frame' })}>↔</button>
						<button type="button" data-testid="centre-v" onclick={() => sendCommand({ type: 'centre', axis: 'v', target: 'frame' })}>↕</button>
						<button type="button" data-testid="centre-both" onclick={() => sendCommand({ type: 'centre', axis: 'both', target: 'frame' })}>⊕</button>
						<button type="button" title="Centre in the safe area" onclick={() => sendCommand({ type: 'centre', axis: 'both', target: 'safe' })}>safe ⊕</button>
						<button type="button" title="Drop this size's override (inherit again)" onclick={() => primary && sendCommand({ type: 'record', run: () => clearNodeProps(primary) })}>reset</button>
					</div>
					<p class="note">stored on {key}: {stored.length ? stored.join(', ') : 'nothing (inherited / formula)'}</p>
				{/if}
				{#if def?.group === 'symbols' && grid}
					<div class="fields">
						<label>symbol scale <input type="number" step="0.01" min="0.05" max="3" data-testid="field-symbol-scale" value={grid.symbolScale} onchange={(event) => gridWrite({ kind: 'symbolScale', value: num(event) })} /></label>
					</div>
				{/if}
			{:else if !primary}
				<p class="note">Click an item on the canvas or in the list. Shift/Ctrl+click adds. Alt+click cycles overlaps.</p>
			{/if}

			{#if showGrid && grid && shape}
				<div class="gridbox" data-testid="grid-inspector">
					<strong>Grid ({key})</strong>
					<div class="fields">
						<label>origin x <input type="number" step="1" data-testid="grid-origin-x" value={grid.origin.x} onchange={(event) => gridWrite({ kind: 'origin', axis: 'x', value: num(event) })} /></label>
						<label>y <input type="number" step="1" data-testid="grid-origin-y" value={grid.origin.y} onchange={(event) => gridWrite({ kind: 'origin', axis: 'y', value: num(event) })} /></label>
					</div>
					<div class="fields">
						<label>spacing x <input type="number" step="1" min="1" data-testid="grid-pitch-x" value={grid.pitch.x} onchange={(event) => gridWrite({ kind: 'pitch', axis: 'x', value: num(event) })} /></label>
						<label>y <input type="number" step="1" min="1" data-testid="grid-pitch-y" value={grid.pitch.y} onchange={(event) => gridWrite({ kind: 'pitch', axis: 'y', value: num(event) })} /></label>
					</div>
					<table class="reels">
						<thead><tr><th>reel</th><th>dx</th><th>dy</th></tr></thead>
						<tbody>
							{#each grid.reels as reel, index (index)}
								<tr class:picked={editorState.grid?.reel === index}>
									<td><button type="button" class="link" onclick={() => select(['board'], { reel: index })}>{index}</button></td>
									<td><input class="tiny" type="number" step="1" data-testid="grid-reel-{index}-dx" value={reel.dx} onchange={(event) => gridWrite({ kind: 'reel', reel: index, axis: 'dx', value: num(event) })} /></td>
									<td><input class="tiny" type="number" step="1" data-testid="grid-reel-{index}-dy" value={reel.dy} onchange={(event) => gridWrite({ kind: 'reel', reel: index, axis: 'dy', value: num(event) })} /></td>
								</tr>
							{/each}
						</tbody>
					</table>
					<div class="cells" data-testid="grid-cells">
						{#each shape.rows as rows, reel (reel)}
							<div class="col" style:padding-top="{((Math.max(...shape.rows) - rows) / 2) * 18}px">
								{#each Array(rows) as _, row (row)}
									{@const nudged = !!grid.cells[`r${reel}c${row}`]}
									<button
										type="button"
										class="cellbtn"
										class:picked={editorState.grid?.reel === reel && editorState.grid.row === row}
										class:nudged
										title="cell r{reel}c{row}"
										onclick={() => select(['board'], { reel, row })}>{nudged ? '•' : ''}</button
									>
								{/each}
							</div>
						{/each}
						{#if selectedCell && editorState.grid?.row !== undefined}
							{@const pick = editorState.grid}
							<div class="fields">
								<span>r{pick.reel}c{pick.row} nudge (±{CELL_NUDGE_MAX})</span>
								<label>dx <input class="tiny" type="number" step="1" min={-CELL_NUDGE_MAX} max={CELL_NUDGE_MAX} data-testid="grid-cell-dx" value={selectedCell.dx} onchange={(event) => gridWrite({ kind: 'cell', reel: pick.reel, row: pick.row!, axis: 'dx', value: num(event) })} /></label>
								<label>dy <input class="tiny" type="number" step="1" min={-CELL_NUDGE_MAX} max={CELL_NUDGE_MAX} data-testid="grid-cell-dy" value={selectedCell.dy} onchange={(event) => gridWrite({ kind: 'cell', reel: pick.reel, row: pick.row!, axis: 'dy', value: num(event) })} /></label>
							</div>
						{/if}
					</div>
					<div class="fields">
						<button type="button" title="Drop this size's grid override" onclick={() => sendCommand({ type: 'record', run: () => resetGrid() })}>reset grid ({layoutStore.writeScope === 'all' ? 'all sizes' : key})</button>
						<span class="note">arrows nudge the picked reel/cell</span>
					</div>
				</div>
			{/if}
			<p class="readout" data-testid="readout">{editorState.readout}{editorState.status ? ` · ${editorState.status}` : ''}</p>
		</div>
	{/if}
</aside>

<style>
	.layers {
		position: fixed;
		right: 0;
		bottom: 0;
		z-index: 21;
		width: clamp(210px, 34vw, 290px);
		display: flex;
		flex-direction: column;
		background: rgba(14, 17, 22, 0.9);
		color: #f3efe4;
		font: 12px/1.3 'Segoe UI', sans-serif;
		border-left: 1px solid rgba(255, 255, 255, 0.1);
		overflow: hidden;
	}
	.layers.folded { width: auto; bottom: auto; }
	/* Phone portrait: dock at the bottom so the reels (upper half) stay reachable on the canvas. */
	@media (max-width: 600px) and (orientation: portrait) {
		.layers:not(.folded) {
			top: auto !important;
			left: 0;
			width: auto;
			height: 44vh;
			border-left: none;
			border-top: 1px solid rgba(255, 255, 255, 0.15);
		}
		.layers.folded { top: auto !important; bottom: 0; }
	}
	.bar, .snaps, .fields, .group, .item, .title { display: flex; gap: 4px; align-items: center; flex-wrap: wrap; }
	.bar { padding: 4px 6px; border-bottom: 1px solid #2a303c; }
	.snaps { padding: 2px 6px; color: #c8c2b4; }
	.snaps label { display: inline-flex; align-items: center; gap: 2px; }
	.tree { flex: 1 1 auto; overflow: auto; min-height: 80px; padding: 2px 0; }
	.group { padding: 3px 4px; background: #1b2029; border-top: 1px solid #2a303c; flex-wrap: nowrap; }
	.item { padding: 1px 4px 1px 18px; cursor: pointer; flex-wrap: nowrap; }
	.item.sub { padding-left: 34px; color: #b8d8ff; }
	.item.cell { padding-left: 58px; color: #b8d8ff; }
	.item:hover { background: #232a36; }
	.item.selected { background: #0d4f63; }
	.item.dim .name { color: #7c7769; }
	.item.hidden-row .name { text-decoration: line-through; color: #8d877a; }
	.name { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
	.sp { flex: 1 1 auto; }
	.badge { font-size: 10px; }
	button, select, input {
		background: #232833;
		color: #f3efe4;
		border: 1px solid #3a4150;
		border-radius: 3px;
		padding: 1px 5px;
		font: inherit;
	}
	button.active { background: #e23d2b; border-color: #e23d2b; }
	button.icon, button.caret { padding: 0 3px; border-color: transparent; background: transparent; }
	button.icon.off { opacity: 0.45; filter: grayscale(1); }
	button.icon.unlocked { opacity: 0.3; }
	button.icon.on { color: #f5c542; background: #5a4a12; border-radius: 3px; }
	button:disabled { opacity: 0.3; }
	button.link { background: none; border: none; color: #8fd3ff; padding: 0; }
	input { width: 4.2rem; }
	input.tiny { width: 3rem; }
	.snaps input[type='checkbox'], .check input { width: auto; }
	.inspector { flex: 0 0 auto; max-height: 55%; overflow: auto; padding: 4px 6px 6px; border-top: 1px solid #3a4150; display: flex; flex-direction: column; gap: 4px; }
	.title { justify-content: space-between; }
	.title span, .note { color: #a9a395; }
	.note { margin: 0; font-size: 11px; }
	.gridbox { border: 1px solid #2c5866; border-radius: 4px; padding: 4px; display: flex; flex-direction: column; gap: 4px; }
	table.reels { border-collapse: collapse; }
	table.reels td, table.reels th { padding: 0 4px; text-align: left; }
	tr.picked { background: #4a1f45; }
	.cells { display: flex; gap: 3px; flex-wrap: wrap; align-items: flex-start; }
	.col { display: flex; flex-direction: column; gap: 2px; }
	.cellbtn { width: 18px; height: 16px; padding: 0; font-size: 10px; line-height: 1; }
	.cellbtn.picked { background: #ff3dd2; border-color: #ff3dd2; }
	.cellbtn.nudged { border-color: #f5c542; }
	.readout { margin: 0; color: #3dffb0; font-family: monospace; font-size: 11px; min-height: 1em; }
</style>
