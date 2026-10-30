<script lang="ts">
	import { onMount } from 'svelte';

	import {
		ORIENTATION_TWIN,
		VIEWPORT_KEYS,
		VIEWPORTS,
		ancestorChain,
		isMobileLandscapeKey,
		type ViewportKey,
	} from './builder.schema';
	import { loadBuilderRounds, loadEventCatalogue } from './events/catalogue';
	import { isLandscapeIssue, runGameCheck, type CheckIssue } from './check/game-check';
	import { overrideReport, resolveUiItem, uiBand, uiMinText, uiPreviewInsets, type UiItemDef, type UiPopup } from '../../ui-builder/src/ui.schema';
	import { gpuBytes, memoryWarning, missingMobileWarnings, type ArtCatalogue } from './art/validate';
	import PreviewPanel from './PreviewPanel.svelte';
	import LayersPanel from './LayersPanel.svelte';
	import { editorState, setMode } from './editor/state.svelte';
	import SpinePanel from './SpinePanel.svelte';
	import AudioPanel from './AudioPanel.svelte';
	import { exportAllowed, formulaFor, worldOf } from './layout/guards';
	import { LOCALES } from './layout/messages';
	import {
		activeUi,
		activeViewport,
		adoptUpload,
		copyLayoutFrom,
		currentFindings,
		layoutStore,
		readFrameLayout,
		saveLayout,
		saveUi,
		setArtAnchor,
		setPreviewInsets,
		setSharedBand,
		setSharedMinText,
		setSharedPopup,
		setUiPreviewHead,
		setUiVersion,
		setLocale,
		setOverlay,
		setViewportOverride,
		setWriteScope,
	} from './store.svelte';

	type Tab = 'layout' | 'ui' | 'art' | 'spine' | 'audio' | 'events' | 'preview';

	const tabs: { id: Tab; label: string }[] = [
		{ id: 'layout', label: 'Layout' },
		{ id: 'ui', label: 'UI' },
		{ id: 'art', label: 'Art' },
		{ id: 'spine', label: 'Spine' },
		{ id: 'audio', label: 'Audio' },
		{ id: 'events', label: 'Events' },
		{ id: 'preview', label: 'Preview' },
	];

	let tab = $state<Tab>('layout');
	let section = $state<'art' | 'spine' | 'audio'>('art');
	let keyName = $state('slot');
	let dragging = $state(false);
	let message = $state('');
	let catalogueNote = $state('catalogue not loaded');
	let exportNote = $state('');
	let copyFrom = $state<ViewportKey>('desktop');
	let compareA = $state<ViewportKey>('desktop');
	let compareB = $state<ViewportKey>('mobileL');
	let artCatalogue = $state<ArtCatalogue | null>(null);
	let artNote = $state('slots loading');
	let anchorSlot = $state('screen_logo');
	let anchorX = $state(0.5);
	let anchorY = $state(0.5);
	let checkNote = $state('');
	/** Fold to the title row on small screens. The shell stays mounted (always on in dev). */
	let folded = $state(false);
	let checkIssues = $state<CheckIssue[]>([]);
	/** Shell height, so the layer panel sits just below it. */
	let shellHeight = $state(0);

	/** Size buttons: desktop family, then the three mobile sizes with a portrait/landscape toggle. */
	const SIZE_KEYS = VIEWPORT_KEYS.filter((key) => !isMobileLandscapeKey(key));
	const portraitOf = (key: ViewportKey): ViewportKey => (isMobileLandscapeKey(key) ? ORIENTATION_TWIN[key]! : key);


	const viewport = $derived(activeViewport());
	const ui = $derived(activeUi());
	const head = $derived(layoutStore.ui.head);
	const ownBand = $derived(head?.guardRails.controlBar[viewport]);
	const insets = $derived(uiPreviewInsets(head, viewport));
	const overrides = $derived(ui ? overrideReport(ui, layoutStore.data.ui) : []);
	const popupRows = $derived.by(() => {
		const source = head ?? ui;
		if (!source) return [];
		return Object.entries(source.popups as Record<string, UiPopup>).map(([id, entry]) => {
			const pick = <K extends 'maxHeight' | 'padding' | 'scrollbar'>(field: K) => {
				const chain = ancestorChain(viewport);
				for (let index = chain.length - 1; index >= 0; index -= 1) {
					const value = entry.viewports?.[chain[index]!]?.[field];
					if (value !== undefined) return { value, own: index === chain.length - 1 };
				}
				return { value: undefined, own: false };
			};
			return { id, shell: entry.shell === true, maxHeight: pick('maxHeight'), padding: pick('padding'), scrollbar: pick('scrollbar') };
		});
	});
	const num = (event: Event) => Number((event.currentTarget as HTMLInputElement).value);
	const artRecord = $derived(layoutStore.data.art as {
		slots?: Record<string, { src?: string; w?: number; h?: number; anchor?: number[]; lockToCell?: number }>;
		moods?: Record<string, string>;
	});
	const memory = $derived(
		gpuBytes(
			Object.values(artRecord.slots ?? {})
				.filter((slot) => typeof slot.w === 'number' && typeof slot.h === 'number')
				.map((slot) => ({ w: slot.w ?? 0, h: slot.h ?? 0 })),
		),
	);
	const memoryNote = $derived(memoryWarning(memory)?.message ?? `${(memory / 1024).toFixed(1)} KB GPU (phone budget 256 MB)`);
	const mobileNotes = $derived(
		artCatalogue ? missingMobileWarnings(artCatalogue, new Set(Object.keys(artRecord.slots ?? {}))) : [],
	);
	const findings = $derived(currentFindings());
	const reds = $derived(findings.filter((finding) => finding.level === 'red'));
	const ambers = $derived(findings.filter((finding) => finding.level === 'amber'));

	const compared = $derived.by(() => {
		const frame = readFrameLayout();
		const fallback = formulaFor(frame);
		return [compareA, compareB].map((key) => ({
			key,
			board: worldOf(key, 'board', layoutStore.data, fallback),
			plaque: worldOf(key, 'waysPlaque', layoutStore.data, fallback),
		}));
	});

	$effect(() => {
		if (tab !== 'events' && tab !== 'preview') return;
		void Promise.all([loadEventCatalogue(), loadBuilderRounds()]).then(([events, rounds]) => {
			const loaded = events && 'available' in events && events.available && rounds && 'available' in rounds && rounds.available;
			catalogueNote = loaded ? 'catalogue loaded' : 'catalogue not loaded';
		});
	});

	function selectViewport(next: ViewportKey) {
		setViewportOverride(layoutStore.viewportOverride === next ? null : next);
	}

	function onExport() {
		exportNote = exportAllowed(findings) ? 'export allowed' : 'export blocked';
	}

	async function runCheck() {
		const [events, rounds] = await Promise.all([loadEventCatalogue(), loadBuilderRounds()]);
		const catalogue = events && 'catalogue' in events ? (events.catalogue as { events?: { type?: string; scope?: string }[] }) : null;
		const roundFile = rounds && 'rounds' in rounds ? rounds.rounds : null;
		if (!catalogue) {
			checkNote = 'check not available';
			return;
		}
		const state = layoutStore.ui;
		const releases =
			state.pin && state.pinned && state.releases.includes(state.pin) ? { [state.pin]: state.pinned } : {};
		const result = runGameCheck({
			builder: layoutStore.data,
			catalogue,
			rounds: roundFile,
			uiHead: state.head,
			uiReleases: releases,
			locale: layoutStore.locale,
		});
		const errors = result.issues.filter((issue) => issue.level === 'error');
		const warnings = result.issues.filter((issue) => issue.level === 'warning');
		const landscape = warnings.filter(isLandscapeIssue);
		checkIssues = [...errors, ...warnings];
		checkNote = `${errors.length} errors, ${warnings.length} warnings (${landscape.length} landscape)`;
	}

	async function uploadFiles(files: File[]) {
		if (files.length === 0) return;
		const body = new FormData();
		body.set('section', section);
		body.set('key', keyName.trim() || 'slot');
		for (const file of files) body.append('files', file, file.name);
		message = 'uploading…';
		const response = await fetch('/__upload', { method: 'POST', body });
		const text = await response.text();
		if (!response.ok) {
			message = `${response.status} ${text}`;
			return;
		}
		const payload = JSON.parse(text) as {
			paths?: string[];
			bytesBefore?: number;
			bytesAfter?: number;
			warning?: string;
		};
		const fresh = await fetch('/__layout');
		if (fresh.ok) {
			const file = (await fresh.json()) as {
				file: typeof layoutStore.data;
				hashes: typeof layoutStore.hashes;
			};
			adoptUpload(section, file.file, file.hashes);
		}
		const size =
			payload.bytesBefore !== undefined
				? `${payload.bytesBefore} → ${payload.bytesAfter} bytes`
				: '';
		message = [payload.paths?.join(', ') || 'stored original', size, payload.warning].filter(Boolean).join(' · ');
	}

	onMount(() => {
		const onOver = (event: DragEvent) => {
			if (![...(event.dataTransfer?.types ?? [])].includes('Files')) return;
			event.preventDefault();
			dragging = true;
		};
		const onLeave = (event: DragEvent) => {
			if (event.relatedTarget) return;
			dragging = false;
		};
		const onDropWindow = (event: DragEvent) => {
			if (![...(event.dataTransfer?.types ?? [])].includes('Files')) return;
			event.preventDefault();
			dragging = false;
			void uploadFiles([...(event.dataTransfer?.files ?? [])]);
		};
		void fetch('/dev/art-slots.json')
			.then(async (response) => {
				if (!response.ok) {
					artNote = 'slots not loaded';
					return;
				}
				artCatalogue = (await response.json()) as ArtCatalogue;
				artNote = `${artCatalogue.slots.length} slots`;
			})
			.catch(() => {
				artNote = 'slots not loaded';
			});
		window.addEventListener('dragover', onOver);
		window.addEventListener('dragleave', onLeave);
		window.addEventListener('drop', onDropWindow);
		return () => {
			window.removeEventListener('dragover', onOver);
			window.removeEventListener('dragleave', onLeave);
			window.removeEventListener('drop', onDropWindow);
		};
	});
</script>

<div class="shell" data-testid="builder-shell" bind:clientHeight={shellHeight}>
	<header>
		<strong>Locked In builder</strong>
		<button
			type="button"
			class:active={editorState.mode === 'edit'}
			data-testid="shell-mode-toggle"
			title="Edit: pick and drag on the canvas. Play: clicks go to the game. Backtick toggles."
			onclick={() => setMode(editorState.mode === 'edit' ? 'play' : 'edit')}
		>
			{editorState.mode === 'edit' ? '✎ Edit' : '▶ Play'}
		</button>
		<nav>
			{#each tabs as item (item.id)}
				<button
					type="button"
					class:active={tab === item.id}
					onclick={() => {
						tab = item.id;
						folded = false;
					}}
				>
					{item.label}
				</button>
			{/each}
			<button
				type="button"
				data-testid="fold-shell"
				title={folded ? 'Show the builder panel' : 'Fold the panel to its title row (the shell stays on)'}
				onclick={() => (folded = !folded)}>{folded ? '▸ unfold' : '▾ fold'}</button
			>
		</nav>
		{#if folded}
			<span class="hint" data-testid="active-viewport">
				{viewport} {VIEWPORTS[viewport].w}×{VIEWPORTS[viewport].h}{layoutStore.viewportOverride ? ' (picked)' : ' (auto)'}
			</span>
		{:else}
		<div class="sizes" aria-label="Viewport">
			{#each SIZE_KEYS as key (key)}
				{@const twin = ORIENTATION_TWIN[key]}
				{#if twin}
					<span class="mobile" data-testid="size-{key}">
						<button
							type="button"
							class:active={portraitOf(viewport) === key}
							onclick={() => selectViewport(viewport === twin ? twin : key)}
						>
							{key}
						</button><button
							type="button"
							class="orient"
							title="portrait {VIEWPORTS[key].w}×{VIEWPORTS[key].h}"
							data-testid="orient-{key}-portrait"
							class:active={viewport === key}
							onclick={() => setViewportOverride(key)}>▯</button
						><button
							type="button"
							class="orient"
							title="landscape {VIEWPORTS[twin].w}×{VIEWPORTS[twin].h}"
							data-testid="orient-{key}-landscape"
							class:active={viewport === twin}
							onclick={() => setViewportOverride(twin)}>▭</button
						>
					</span>
				{:else}
					<button type="button" class:active={viewport === key} onclick={() => selectViewport(key)}>
						{key}
					</button>
				{/if}
			{/each}
			<span class="hint" data-testid="active-viewport">
				{viewport} {VIEWPORTS[viewport].w}×{VIEWPORTS[viewport].h}{layoutStore.viewportOverride ? ' (picked)' : ' (auto)'}
			</span>
		</div>
		<label>
			write
			<select
				value={layoutStore.writeScope}
				onchange={(event) => setWriteScope((event.currentTarget as HTMLSelectElement).value as 'key' | 'all')}
			>
				<option value="key">this size</option>
				<option value="all">All sizes</option>
			</select>
		</label>
		<button type="button" onclick={() => void saveLayout(['layout', 'ui'])}>Save</button>
		<button type="button" data-testid="export-layout" onclick={onExport}>Export</button>
		<button type="button" data-testid="check-bindings" onclick={() => void runCheck()}>Check</button>
		<span data-testid="check-result">{checkNote}</span>
		<label>
			locale
			<select
				data-testid="locale"
				value={layoutStore.locale}
				onchange={(event) => setLocale((event.currentTarget as HTMLSelectElement).value)}
			>
				{#each LOCALES as locale (locale)}
					<option value={locale}>{locale}</option>
				{/each}
			</select>
		</label>
		{/if}
	</header>

	{#if !folded}
	{#if tab === 'layout'}
		<p class="hint">
			Edit mode is on by default (backtick or ✎/▶ switches to Play). Drag snaps to centre, edges, safe area, other
			items and an 8px grid (toggle in Layers); Alt = free, Shift = lock axis. Arrows nudge 1px, Shift 10px, Ctrl 8px.
			Pick a reel or cell in Layers → Grid to nudge it. Save still writes when export is blocked.
		</p>
		<div class="upload">
			<label><input type="checkbox" checked={layoutStore.overlays.band} onchange={(event) => setOverlay('band', (event.currentTarget as HTMLInputElement).checked)} /> band</label>
			<label><input type="checkbox" checked={layoutStore.overlays.safe} onchange={(event) => setOverlay('safe', (event.currentTarget as HTMLInputElement).checked)} /> safe area</label>
			<label><input type="checkbox" checked={layoutStore.overlays.grid} onchange={(event) => setOverlay('grid', (event.currentTarget as HTMLInputElement).checked)} /> grid</label>
			<label>
				copy from
				<select bind:value={copyFrom}>
					{#each VIEWPORT_KEYS as key (key)}
						<option value={key}>{key}</option>
					{/each}
				</select>
			</label>
			<button type="button" onclick={() => copyLayoutFrom(copyFrom, viewport)}>Copy onto {viewport}</button>
		</div>
		<div class="compare" data-testid="compare">
			<span>Compare</span>
			<select bind:value={compareA}>
				{#each VIEWPORT_KEYS as key (key)}
					<option value={key}>{key}</option>
				{/each}
			</select>
			<select bind:value={compareB}>
				{#each VIEWPORT_KEYS as key (key)}
					<option value={key}>{key}</option>
				{/each}
			</select>
			{#each compared as row (row.key)}
				<span data-testid="compare-{row.key}">
					{row.key} board {row.board.x.toFixed(1)},{row.board.y.toFixed(1)} plaque {row.plaque.x.toFixed(1)},{row.plaque.y.toFixed(1)}
				</span>
			{/each}
		</div>
		<p class="hint" data-testid="export-status">
			{exportNote}
			{reds.length ? `${reds.length} red` : 'no red'}
			· {ambers.length} amber
		</p>
		<ul class="findings">
			{#each findings.slice(0, 8) as finding (`${finding.code}-${finding.viewport}-${finding.id}`)}
				<li class={finding.level}>{finding.level}: {finding.message}</li>
			{/each}
		</ul>
	{:else if tab === 'ui'}
		<p class="warn" data-testid="ui-warning">
			Shared UI: packages/ui-builder/ui.json is used by EVERY game. A change here affects every game that pins this
			version once it is released (pnpm --filter ui-builder release). Games only move shared items through
			explicit uiOverrides, clamped by these guard rails.
		</p>
		{#if head}
			<p class="hint" data-testid="ui-versions">
				working ui.json v{head.version} · this game pins v{layoutStore.ui.pin ?? '—'} · released: {layoutStore.ui.releases.join(', ') || 'none'}
				· {layoutStore.uiDirty ? '● unsaved' : 'saved'} · overlay shows {layoutStore.uiPreviewHead ? 'working copy' : 'pinned release'}
				{#if layoutStore.uiError}<span class="err"> · {layoutStore.uiError}</span>{/if}
			</p>
			<div class="upload">
				<label><input type="checkbox" checked={layoutStore.uiPreviewHead} onchange={(event) => setUiPreviewHead((event.currentTarget as HTMLInputElement).checked)} /> preview working ui.json</label>
				<label>version <input class="short" value={head.version} onchange={(event) => setUiVersion((event.currentTarget as HTMLInputElement).value)} /></label>
				<button type="button" data-testid="save-ui" onclick={() => void saveUi()}>Save ui.json</button>
			</div>
			{#if layoutStore.uiWarnings.length}
				<ul class="findings" data-testid="ui-save-warnings">
					{#each layoutStore.uiWarnings as warning, index (index)}
						<li class="amber">saved with warning: {warning}</li>
					{/each}
				</ul>
			{/if}
			<div class="upload" data-testid="ui-rails">
				<strong>{viewport}</strong>
				<label>band <input class="short" type="number" value={ownBand ?? ''} placeholder={`${uiBand(head, viewport)} inherited`} onchange={(event) => setSharedBand(viewport, num(event))} /></label>
				<label>preview insets t/r/b/l
					{#each ['top', 'right', 'bottom', 'left'] as const as edge (edge)}
						<input class="tiny" type="number" min="0" value={insets[edge]} onchange={(event) => setPreviewInsets(viewport, { ...insets, [edge]: num(event) })} />
					{/each}
				</label>
				<label>min text <input class="tiny" type="number" value={uiMinText(head, viewport)} onchange={(event) => setSharedMinText(viewport, num(event))} /></label>
				<span>tap ≥ {head.guardRails.minTapPx}px · runtime insets: env(safe-area-inset-*)</span>
			</div>
			<table class="popups" data-testid="ui-popups">
				<thead><tr><th>popup ({viewport})</th><th>maxHeight</th><th>padding</th><th>scrollbar</th></tr></thead>
				<tbody>
					{#each popupRows as row (row.id)}
						<tr>
							<td>{row.id}{row.shell ? ' (shell)' : ''}</td>
							<td><input class="tiny" type="number" value={row.maxHeight.value ?? ''} class:inherited={!row.maxHeight.own} onchange={(event) => setSharedPopup(row.id, viewport, 'maxHeight', num(event))} /></td>
							<td><input class="tiny" type="number" value={row.padding.value ?? ''} class:inherited={!row.padding.own} onchange={(event) => setSharedPopup(row.id, viewport, 'padding', num(event))} /></td>
							<td><input type="checkbox" checked={row.scrollbar.value === true} onchange={(event) => setSharedPopup(row.id, viewport, 'scrollbar', (event.currentTarget as HTMLInputElement).checked)} /></td>
						</tr>
					{/each}
				</tbody>
			</table>
			<p class="hint" data-testid="ui-items">
				Items: {#each Object.entries(head.items as Record<string, UiItemDef>) as [id, def] (id)}<span class="chip">{id}{def.kind ? ` ·${def.kind}` : ''}{Object.keys(resolveUiItem(head, id, viewport)).length ? ' ✎' : ''}</span>{/each}
			</p>
			<p class="hint" data-testid="ui-overrides">
				Game uiOverrides ({overrides.length}):
				{#each overrides as row (`${row.id}-${row.key}`)}
					<span class:clamped={row.flags.length > 0}>{row.id}@{row.key} {row.flags.length ? `clamped: ${row.flags.join(', ')}` : 'ok'}</span>
				{:else}
					none
				{/each}
			</p>
		{:else}
			<p class="hint">Working ui.json not loaded (dev server only).</p>
		{/if}
	{:else if tab === 'art'}
		<p class="hint" data-testid="art-slots">
			{artNote}. Moods are stored here and applied on a forced degen_spin in the book preview. Dropping a PNG writes WebP. Static slots stay WebP until a Spine export replaces them.
		</p>
		<p class="hint" data-testid="art-memory">{memoryNote}</p>
		<p class="hint">
			Moods:
			{#each Object.entries(artRecord.moods ?? {}) as [mood, slot] (mood)}
				<span>{mood}→{slot}</span>
			{/each}
		</p>
		{#if mobileNotes.length}
			<p class="hint">{mobileNotes[0]?.message}</p>
		{/if}
		<div class="upload">
			<label>
				anchor
				<select bind:value={anchorSlot}>
					{#each Object.keys(artRecord.slots ?? {}) as id (id)}
						<option value={id}>{id}</option>
					{/each}
				</select>
			</label>
			<input type="number" min="0" max="1" step="0.05" bind:value={anchorX} />
			<input type="number" min="0" max="1" step="0.05" bind:value={anchorY} />
			<button
				type="button"
				onclick={() => {
					setArtAnchor(anchorSlot, [anchorX, anchorY]);
					void saveLayout('art');
				}}
			>
				Save anchor
			</button>
			<span>fire rim lock-to-cell {artRecord.slots?.board_fireRim?.lockToCell ?? 2}px</span>
		</div>
	{:else if tab === 'spine'}
		<SpinePanel />
	{:else if tab === 'audio'}
		<AudioPanel />
	{:else if tab === 'events'}
		<p class="hint">{catalogueNote}</p>
	{:else if tab === 'preview'}
		<PreviewPanel />
	{/if}

	{#if checkIssues.length}
		<ul class="findings" data-testid="check-list">
			{#each checkIssues.slice(0, 12) as issue, index (index)}
				<li class={issue.level === 'error' ? 'red' : 'amber'}>{issue.level} {issue.code}: {issue.message}</li>
			{/each}
		</ul>
	{/if}

	<div class="upload">
		<label>
			section
			<select bind:value={section}>
				<option value="art">art</option>
				<option value="spine">spine</option>
				<option value="audio">audio</option>
			</select>
		</label>
		<label>
			key
			<input bind:value={keyName} />
		</label>
		<span>{message}</span>
	</div>
	{/if}
</div>

<LayersPanel top={shellHeight} />

<div class="drop" class:dragging aria-hidden="true"></div>

<style>
	.shell {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		z-index: 20;
		display: flex;
		flex-direction: column;
		gap: 6px;
		padding: 8px 12px 10px;
		background: rgba(14, 17, 22, 0.92);
		color: #f3efe4;
		font: 13px/1.3 'Segoe UI', sans-serif;
		border-bottom: 1px solid rgba(255, 255, 255, 0.08);
		pointer-events: auto;
	}
	header {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		align-items: center;
	}
	nav, .sizes {
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
	}
	button, select, input {
		background: #232833;
		color: #f3efe4;
		border: 1px solid #3a4150;
		border-radius: 4px;
		padding: 4px 8px;
	}
	button.active {
		background: #e23d2b;
		border-color: #e23d2b;
	}
	input { width: 8rem; }
	input.short { width: 4.5rem; }
	input.tiny { width: 3.2rem; }
	input.inherited { color: #8d877a; }
	.mobile { display: inline-flex; }
	.mobile button { border-radius: 0; }
	.mobile button:first-child { border-radius: 4px 0 0 4px; }
	.mobile button:last-child { border-radius: 0 4px 4px 0; }
	button.orient { padding: 4px 6px; }
	.warn { margin: 0; padding: 4px 8px; background: rgba(226, 61, 43, 0.22); border: 1px solid #e23d2b; border-radius: 4px; }
	.err, .clamped { color: #ff8d82; }
	.chip { display: inline-block; margin: 0 4px 2px 0; padding: 0 4px; border: 1px solid #3a4150; border-radius: 3px; }
	table.popups { border-collapse: collapse; font-size: 12px; }
	table.popups td, table.popups th { padding: 1px 6px; text-align: left; }
	.hint { margin: 0; color: #c8c2b4; }
	.upload, .compare { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
	.findings { margin: 0; padding-left: 18px; max-height: 7.5rem; overflow: auto; }
	.findings .red { color: #ff8d82; }
	.findings .amber { color: #f5c542; }
	.drop {
		position: fixed;
		inset: 0;
		z-index: 15;
		pointer-events: none;
	}
	.drop.dragging {
		pointer-events: auto;
		background: rgba(226, 61, 43, 0.18);
		outline: 2px dashed #e23d2b;
		outline-offset: -8px;
	}
</style>
