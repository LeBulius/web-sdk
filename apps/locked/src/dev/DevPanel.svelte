<script lang="ts">
	import { onMount } from 'svelte';

	import { onBookEvent } from '../../../../packages/layout-editor/src/events/play-book';
	import { NUM_REELS } from '../game/constants';
	import { eventEmitter } from '../game/eventEmitter';
	import { loadSharedCueMap, type SharedCueMap } from './cueMap';
	import {
		BUTTON_CUE_NAMES,
		DEV_PANEL_MARKER,
		flagClass,
		flagLabel,
		flagsFor,
		groupCues,
		type CueKind,
		type CueHit,
		type LogRow,
		type LogSnapshot,
	} from './cueLog';
	import {
		EVENT_QUERIES,
		ROUND_MODES,
		loadEventMatches,
		prepareIdPlay,
		prepareMatchPlay,
		type EventQuery,
		type PlayLaunch,
		type RoundMatch,
		type RoundMode,
	} from './roundJumper';

	type DevApi = {
		marker: typeof DEV_PANEL_MARKER;
		getLog: () => LogSnapshot;
		isPlaying: () => boolean;
	};

	const QUERY_LABEL: Record<EventQuery, string> = {
		freeSpinTrigger: 'freeSpinTrigger',
		freeSpinRetrigger: 'freeSpinRetrigger',
		maxWin: 'max win',
	};

	let open = $state(false);
	let playing = $state(false);
	let mode = $state<RoundMode>('base');
	let roundId = $state('');
	let forceBigWin = $state(false);
	let forceLevel = $state('6');
	let status = $state('Idle');
	let statusError = $state(false);
	let copyNote = $state('');
	let indexNote = $state(
		'Event types play a story slice first. Fixture books come from /dev/builder_rounds.json.',
	);
	let activeQuery = $state<EventQuery | null>(null);
	let matches = $state.raw<RoundMatch[]>([]);
	let cursor = $state(0);
	let rows = $state<LogRow[]>([]);
	let cueMap = $state<SharedCueMap | null>(null);

	let listening = false;
	let roundStartedAt = 0;
	let rowSerial = 0;
	let roundMeta: LogSnapshot['round'] = null;
	const pending: CueHit[] = [];

	const current = $derived(matches[cursor] ?? null);

	const devWindow = () => window as Window & { __lockedDevPanel?: DevApi };

	function elapsed() {
		return Math.round(performance.now() - roundStartedAt);
	}

	function snapshot(): LogSnapshot {
		return JSON.parse(
			JSON.stringify({
				marker: DEV_PANEL_MARKER,
				cueMap,
				round: roundMeta,
				rows,
			}),
		) as LogSnapshot;
	}

	function noteCue(kind: CueKind, name: string) {
		if (!listening || !name || BUTTON_CUE_NAMES.has(name)) return;
		pending.push({ kind, name, at: elapsed() });
	}

	function takePending() {
		return pending.splice(0, pending.length);
	}

	function pushRow(type: string, index: number, cues: CueHit[]) {
		rows.push({
			id: ++rowSerial,
			at: elapsed(),
			index,
			type,
			cues,
			flags: flagsFor(type, cues),
		});
	}

	function beginRound(launch: PlayLaunch) {
		roundMeta = {
			mode: launch.mode,
			id: launch.id,
			source: launch.source,
			criteria: launch.criteria,
			forced: launch.forced,
			forceApplied: launch.forceApplied,
		};
		takePending();
		rows = [];
		rowSerial = 0;
		roundStartedAt = performance.now();
		listening = true;
	}

	function endRound() {
		if (!listening) return;
		const cues = takePending();
		if (cues.length) pushRow('(trailing)', -1, cues);
		listening = false;
	}

	function forceLevelOrNull() {
		return forceBigWin ? Number(forceLevel) : null;
	}

	function sourceLabel(match: RoundMatch) {
		if (match.source === 'fixture') return 'fixture book';
		if (match.storyFull) return 'story book';
		return 'story slice';
	}

	function finishedStatus(launch: PlayLaunch) {
		const where = `${launch.mode} #${launch.id}`;
		if (launch.forced && launch.forceApplied) {
			return `Finished ${where} — big win level ${launch.forceLevel} forced`;
		}
		if (launch.forced) {
			return `Finished ${where} — no end-of-spin setWin or freeSpinEnd to force`;
		}
		return `Finished ${where}`;
	}

	async function playLaunch(launch: PlayLaunch) {
		statusError = false;
		status = `Playing ${launch.mode} #${launch.id}`;
		beginRound(launch);
		try {
			await launch.play();
		} finally {
			endRound();
		}
		statusError = false;
		status = finishedStatus(launch);
	}

	async function guarded(task: () => Promise<void>) {
		if (playing) return;
		playing = true;
		try {
			await task();
		} catch (error) {
			statusError = true;
			status = error instanceof Error ? error.message : String(error);
		} finally {
			endRound();
			playing = false;
		}
	}

	async function playById() {
		if (playing) return;
		const id = Number(roundId.trim());
		if (!Number.isInteger(id)) {
			statusError = true;
			status = 'Enter a whole round id.';
			return;
		}
		await guarded(async () => {
			status = 'Loading round…';
			const prepared = await prepareIdPlay(mode, id, forceLevelOrNull());
			if ('error' in prepared) {
				statusError = true;
				status = prepared.error;
				return;
			}
			await playLaunch(prepared);
		});
	}

	async function playCursor() {
		const match = matches[cursor];
		if (!match) {
			statusError = true;
			status = 'No match selected.';
			return;
		}
		const prepared = await prepareMatchPlay(match, forceLevelOrNull());
		await playLaunch(prepared);
	}

	async function jump(query: EventQuery) {
		if (playing) return;
		await guarded(async () => {
			statusError = false;
			status = 'Loading matches…';
			const loaded = await loadEventMatches(query);
			activeQuery = query;
			matches = loaded.matches;
			cursor = 0;
			indexNote = loaded.fixtureAvailable
				? `${loaded.storyCount} story · ${loaded.fixtureCount} fixture`
				: `${loaded.storyCount} story · fixture index unavailable, story books only`;
			if (!loaded.matches.length) {
				statusError = true;
				status = `No ${QUERY_LABEL[query]} books.`;
				return;
			}
			await playCursor();
		});
	}

	async function step(delta: number) {
		if (playing || !matches.length) return;
		await guarded(async () => {
			cursor = (cursor + delta + matches.length) % matches.length;
			await playCursor();
		});
	}

	async function playRandom() {
		if (playing || !matches.length) return;
		await guarded(async () => {
			cursor = Math.floor(Math.random() * matches.length);
			await playCursor();
		});
	}

	function onKey(event: KeyboardEvent) {
		if (event.repeat || event.key !== 'F2') return;
		event.preventDefault();
		open = !open;
	}

	function onIdKey(event: KeyboardEvent) {
		if (event.key !== 'Enter') return;
		event.preventDefault();
		void playById();
	}

	async function copyLog() {
		try {
			await navigator.clipboard.writeText(JSON.stringify(snapshot(), null, 2));
			copyNote = 'Copied';
		} catch {
			copyNote = 'Copy failed';
		}
	}

	function clearLog() {
		rows = [];
		takePending();
		copyNote = '';
	}

	eventEmitter.subscribeOnMount({
		soundOnce: (event) => noteCue('once', event.name),
		soundMusic: (event) => noteCue('music', event.name),
		soundLoop: (event) => noteCue('loop', event.name),
		soundStop: (event) => noteCue('stop', event.name),
	});

	onMount(() => {
		const off = onBookEvent((announcement) => {
			if (!listening) return;
			pushRow(announcement.name, announcement.index, takePending());
		});
		const view = devWindow();
		const api: DevApi = {
			marker: DEV_PANEL_MARKER,
			getLog: snapshot,
			isPlaying: () => playing,
		};
		view.__lockedDevPanel = api;
		void loadSharedCueMap().then((map) => {
			cueMap = map;
		});
		return () => {
			off();
			if (view.__lockedDevPanel === api) delete view.__lockedDevPanel;
		};
	});
</script>

<svelte:window onkeydown={onKey} />

<button
	type="button"
	class="toggle"
	data-testid="dev-panel-toggle"
	aria-expanded={open}
	title="Dev panel (F2)"
	onclick={() => (open = !open)}
>
	DEV
</button>

{#if open}
	<section
		class="panel"
		data-testid="dev-panel"
		data-marker={DEV_PANEL_MARKER}
		data-playing={playing ? 'yes' : 'no'}
		aria-label="Dev panel"
	>
		<div class="controls">
			<p class="title">Dev panel <span class="hint">F2</span></p>
			<div class="row">
				<label>
					mode
					<select data-testid="dev-mode" bind:value={mode} disabled={playing}>
						{#each ROUND_MODES as name (name)}
							<option value={name}>{name}</option>
						{/each}
					</select>
				</label>
				<label>
					id
					<input
						data-testid="dev-round-id"
						bind:value={roundId}
						onkeydown={onIdKey}
						disabled={playing}
						inputmode="numeric"
					/>
				</label>
				<button
					type="button"
					data-testid="dev-round-play"
					disabled={playing}
					onclick={() => void playById()}
				>
					Play
				</button>
			</div>
			<div class="row">
				{#each EVENT_QUERIES as query (query)}
					<button
						type="button"
						data-testid={`dev-event-${query}`}
						disabled={playing}
						aria-pressed={activeQuery === query}
						onclick={() => void jump(query)}
					>
						{QUERY_LABEL[query]}
					</button>
				{/each}
			</div>
			<p class="hint" data-testid="dev-index-note">{indexNote}</p>
			<div class="row">
				<button
					type="button"
					data-testid="dev-match-prev"
					disabled={playing || !matches.length}
					onclick={() => void step(-1)}
				>
					Previous
				</button>
				<button
					type="button"
					data-testid="dev-match-next"
					disabled={playing || !matches.length}
					onclick={() => void step(1)}
				>
					Next
				</button>
				<button
					type="button"
					data-testid="dev-match-random"
					disabled={playing || !matches.length}
					onclick={() => void playRandom()}
				>
					Random
				</button>
			</div>
			<p data-testid="dev-match">
				{#if current}
					{current.mode} #{current.id}
					{#if current.criteria}· {current.criteria}{/if}
					· {sourceLabel(current)} · {cursor + 1}/{matches.length}
				{:else}
					No match selected
				{/if}
			</p>
			<div class="row">
				<label>
					<input
						type="checkbox"
						data-testid="dev-force-big-win"
						bind:checked={forceBigWin}
						disabled={playing}
					/>
					Force big win
				</label>
				<label>
					level
					<select
						data-testid="dev-force-level"
						bind:value={forceLevel}
						disabled={playing || !forceBigWin}
					>
						<option value="6">6 big</option>
						<option value="7">7 super</option>
						<option value="8">8 mega</option>
						<option value="9">9 epic</option>
					</select>
				</label>
			</div>
			<p class="status" class:err={statusError} data-testid="dev-round-status">{status}</p>
			<p class="hint">Cue map: {cueMap ? 'loaded' : 'not available yet'}</p>
			<div class="row">
				<button type="button" data-testid="dev-copy-log" onclick={() => void copyLog()}
					>Copy log JSON</button
				>
				<button type="button" data-testid="dev-clear-log" onclick={clearLog}>Clear</button>
				{#if copyNote}<span class="hint">{copyNote}</span>{/if}
			</div>
		</div>
		<ol class="log" data-testid="dev-log">
			{#each rows as row (row.id)}
				<li>
					<span class="at">{row.at}ms</span>
					<span class="idx">#{row.index}</span>
					<span class="type">{row.type}</span>
					{#each groupCues(row.cues) as group, index (`${row.id}-${index}`)}
						<span class="cue"
							>{group.kind}:{group.name}{group.count > 1 ? ` ×${group.count}` : ''}</span
						>
					{/each}
					{#each row.flags as flag (`${row.id}-${flag.kind}-${flag.kind === 'repeat' ? `${flag.cueKind}:${flag.name}` : 'cue'}`)}
						<span class={flagClass(flag)}>{flagLabel(flag, NUM_REELS)}</span>
					{/each}
				</li>
			{:else}
				<li class="hint">No book events yet.</li>
			{/each}
		</ol>
	</section>
{/if}

<style>
	.toggle {
		position: fixed;
		z-index: 31;
		left: 8px;
		bottom: 8px;
		padding: 2px 8px;
		border: 1px solid #3a4150;
		border-radius: 4px;
		background: rgba(12, 14, 18, 0.92);
		color: #f2efe8;
		font:
			11px/1.4 ui-sans-serif,
			system-ui,
			sans-serif;
		pointer-events: auto;
	}

	.panel {
		position: fixed;
		z-index: 30;
		left: 8px;
		bottom: 34px;
		display: flex;
		flex-direction: column;
		width: min(360px, calc(100vw - 16px));
		max-height: 48vh;
		overflow: hidden;
		padding: 8px;
		border: 1px solid #3a4150;
		border-radius: 6px;
		background: rgba(12, 14, 18, 0.92);
		color: #f2efe8;
		font:
			12px/1.35 ui-sans-serif,
			system-ui,
			sans-serif;
		pointer-events: auto;
	}

	.controls {
		flex: none;
		max-height: 30vh;
		overflow: auto;
	}

	.title {
		margin: 0 0 4px;
		font-weight: 650;
	}

	.row {
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
		align-items: center;
		margin: 4px 0;
	}

	label {
		display: inline-flex;
		gap: 4px;
		align-items: center;
	}

	button,
	select,
	input {
		border: 1px solid #3a4150;
		border-radius: 4px;
		background: #232833;
		color: inherit;
		font: inherit;
		padding: 2px 6px;
	}

	input {
		width: 6.5rem;
	}

	button:disabled,
	select:disabled,
	input:disabled {
		opacity: 0.45;
	}

	.hint,
	.status {
		margin: 2px 0;
	}

	.hint {
		color: #b7b1a4;
	}

	.err {
		color: #ff8d82;
	}

	.log {
		flex: 1;
		min-height: 5rem;
		margin: 6px 0 0;
		padding: 0;
		overflow: auto;
		list-style: none;
		border-top: 1px solid #3a4150;
	}

	.log li {
		padding: 2px 0;
		border-bottom: 1px solid rgba(255, 255, 255, 0.05);
	}

	.at,
	.idx {
		color: #b7b1a4;
		margin-right: 4px;
	}

	.type {
		margin-right: 4px;
	}

	.cue,
	.flag {
		display: inline-block;
		margin: 0 4px 2px 0;
	}

	.cue {
		color: #9ecbff;
	}

	.flag-silent {
		color: #9a9488;
	}

	.flag-info {
		color: #d7c27a;
	}

	.flag-repeat {
		color: #f0a36b;
	}

	.flag-expected {
		color: #8fbf8f;
	}
</style>
