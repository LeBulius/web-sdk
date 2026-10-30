<script lang="ts">
	import { onMount } from 'svelte';

	import { asAudioSection, audioFindings, playRoundCues } from './audio/plan';
	import { loadEventCatalogue } from './events/catalogue';
	import { bindAudioCue, layoutStore, saveLayout, setAudioMix } from './store.svelte';

	let events = $state<string[]>([]);
	let device = $state<'phone' | 'desktop'>('phone');
	let note = $state('');
	let dragged = $state('');

	const audio = $derived(asAudioSection(layoutStore.data.audio));
	const cues = $derived(Object.keys(audio.files ?? {}).sort());
	const findings = $derived(audioFindings(audio, events));
	const errors = $derived(findings.filter((finding) => finding.level === 'error'));
	const mix = $derived(audio.mix?.[device] ?? {});

	onMount(() => {
		void loadEventCatalogue().then((result) => {
			if (!result || !('catalogue' in result) || !result.catalogue || typeof result.catalogue !== 'object') return;
			const list = (result.catalogue as { events?: { type?: string }[] }).events ?? [];
			events = list.flatMap((entry) => (typeof entry.type === 'string' ? [entry.type] : []));
		});
	});

	function onDrop(bookEvent: string, event: DragEvent) {
		event.preventDefault();
		const cue = event.dataTransfer?.getData('text/plain') || dragged;
		if (!cue) return;
		bindAudioCue(bookEvent, cue);
		void saveLayout('audio');
		note = `${cue} → ${bookEvent}`;
	}

	function checkRound() {
		const round = playRoundCues(audio, [
			{ type: 'reveal', index: 0, board: [[], [], [], [], []] },
			{ type: 'fireFramesPlaced', index: 1, positions: [{}, {}, {}] },
			{ type: 'contrabandSwap', index: 2, positions: [{}] },
			{ type: 'winInfo', index: 3, totalWin: 20 },
			{ type: 'setWin', index: 4, amount: 20, winLevel: 3 },
			{ type: 'tumbleBoard', index: 5 },
			{ type: 'freeSpinTrigger', index: 6, totalFs: 8 },
			{ type: 'freeSpinRetrigger', index: 7, totalFs: 3 },
			{ type: 'winInfo', index: 8, totalWin: 0 },
		]);
		note = round.doubleFires.length ? `double-fire ${round.doubleFires.join(', ')}` : `no double-fire · ${round.cues.length} cues`;
	}
</script>

<p class="hint" data-testid="audio-summary">
	{cues.length} cues in one sprite
	{audio.placeholders ? '· placeholders' : ''}
	· {errors.length ? `${errors.length} audio errors` : 'audio ok'}
	· silent until the first tap
</p>

<div class="upload">
	<button type="button" class:active={device === 'phone'} onclick={() => (device = 'phone')}>Phone</button>
	<button type="button" class:active={device === 'desktop'} onclick={() => (device = 'desktop')}>Desktop</button>
	<label>
		music {mix.musicDb ?? 0} dB
		<input
			type="range"
			min="-24"
			max="0"
			step="1"
			value={mix.musicDb ?? 0}
			oninput={(event) => setAudioMix(device, 'musicDb', Number((event.currentTarget as HTMLInputElement).value))}
		/>
	</label>
	<label>
		sfx {mix.sfxDb ?? 0} dB
		<input
			type="range"
			min="-24"
			max="0"
			step="1"
			value={mix.sfxDb ?? 0}
			oninput={(event) => setAudioMix(device, 'sfxDb', Number((event.currentTarget as HTMLInputElement).value))}
		/>
	</label>
	<button type="button" data-testid="audio-check" onclick={checkRound}>Check round</button>
	<span data-testid="audio-note">{note}</span>
</div>

<ul class="spine-list" data-testid="audio-cues">
	{#each cues as cue (cue)}
		<li>
			<button
				type="button"
				draggable="true"
				data-testid="audio-cue-{cue}"
				ondragstart={(event) => {
					dragged = cue;
					event.dataTransfer?.setData('text/plain', cue);
				}}
			>
				{cue}
				<span class="badge">{audio.files?.[cue]?.channel}{audio.files?.[cue]?.placeholder ? ' · placeholder' : ''}</span>
			</button>
		</li>
	{/each}
</ul>

<div class="upload" data-testid="audio-events">
	{#each events as bookEvent (bookEvent)}
		<button
			type="button"
			data-testid="audio-event-{bookEvent}"
			ondragover={(event) => event.preventDefault()}
			ondrop={(event) => onDrop(bookEvent, event)}
		>
			{bookEvent}
		</button>
	{/each}
</div>

<ul class="findings">
	{#each findings.filter((finding) => finding.level !== 'ok').slice(0, 6) as finding (`${finding.code}-${finding.message}`)}
		<li class={finding.level}>{finding.level}: {finding.message}</li>
	{/each}
</ul>

<style>
	.hint { margin: 0; color: #c8c2b4; }
	.upload { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
	.spine-list {
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
		max-height: 6.5rem;
		overflow: auto;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	button {
		background: #232833;
		color: #f3efe4;
		border: 1px solid #3a4150;
		border-radius: 4px;
		padding: 4px 8px;
	}
	button.active { background: #e23d2b; border-color: #e23d2b; }
	.badge { margin-left: 6px; font-size: 10px; text-transform: uppercase; color: #c8c2b4; }
	.findings { margin: 0; padding-left: 18px; max-height: 5rem; overflow: auto; }
	.findings .red, .findings .error { color: #ff8d82; }
	.findings .warning { color: #f5c542; }
	input[type='range'] { width: 7rem; }
</style>
