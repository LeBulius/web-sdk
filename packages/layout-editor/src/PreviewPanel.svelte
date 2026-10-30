<script lang="ts">
	import { onMount } from 'svelte';

	import { loadBuilderRounds, loadEventCatalogue } from './events/catalogue';
	import { moodForMode, playBookEvent, winBindingAllowed, type BookEvent } from './events/play-book';
	import { setPreviewMood } from './store.svelte';

	type Sample = {
		id: number;
		criteria: string;
		payoutMultiplier: number;
		tags: string[];
		events: BookEvent[];
	};
	type RoundIndex = { id: number; criteria: string; tags: string[]; payoutMultiplier: number };
	type ModeFile = { cost: number; rounds: RoundIndex[]; samples: Sample[] };

	let note = $state('loading books');
	let modes = $state<string[]>([]);
	let mode = $state('base');
	let file = $state<Record<string, ModeFile>>({});
	let roundId = $state('');
	let cursor = $state(0);
	let events = $state<BookEvent[]>([]);
	let current = $state<BookEvent | null>(null);
	let lastAnnounce = $state('');

	const samples = $derived(file[mode]?.samples ?? []);
	const tags = $derived([...new Set(samples.flatMap((sample) => sample.tags))].sort());

	onMount(() => {
		void Promise.all([loadEventCatalogue(), loadBuilderRounds()]).then(([catalogue, rounds]) => {
			if (!catalogue || !('available' in catalogue) || !catalogue.available) {
				note = 'catalogue not loaded';
				return;
			}
			if (!rounds || !('available' in rounds) || !rounds.available) {
				note = 'rounds not loaded';
				return;
			}
			const body = rounds.rounds as { modes?: Record<string, ModeFile> };
			file = body.modes ?? {};
			modes = Object.keys(file);
			if (!file[mode] && modes[0]) mode = modes[0];
			const count = (catalogue.catalogue as { events?: unknown[] }).events?.length ?? 0;
			note = `${count} events`;
		});
	});

	function show(list: BookEvent[], index = 0) {
		events = list;
		cursor = index;
		current = list[index] ?? null;
		if (current) {
			void playBookEvent(current);
			lastAnnounce = `${current.type} #${current.index}`;
		}
	}

	function pickSample(sample: Sample) {
		roundId = String(sample.id);
		setPreviewMood(moodForMode(mode));
		show(sample.events, 0);
	}

	function randomSample() {
		const pool = samples.filter((sample) => sample.events?.length);
		if (!pool.length) return;
		const sample = pool[Math.floor(Math.random() * pool.length)]!;
		pickSample(sample);
	}

	async function loadId() {
		const id = Number(roundId);
		const sample = samples.find((entry) => entry.id === id);
		if (sample) {
			pickSample(sample);
			return;
		}
		const response = await fetch(`/dev/round?mode=${encodeURIComponent(mode)}&id=${id}`);
		if (!response.ok) {
			note = `round ${id} not in ${mode}`;
			return;
		}
		const round = (await response.json()) as { events: BookEvent[] };
		setPreviewMood(moodForMode(mode));
		show(round.events, 0);
		note = `round ${id}`;
	}

	function step(delta: number) {
		if (!events.length) return;
		const next = Math.min(events.length - 1, Math.max(0, cursor + delta));
		show(events, next);
	}

	function playForcedDegen() {
		mode = 'degen_spin';
		const sample = file.degen_spin?.samples?.[0];
		if (!sample) {
			note = 'no degen_spin sample';
			return;
		}
		pickSample(sample);
		note = 'forced degen_spin';
	}
</script>

<div class="preview" data-testid="preview">
	<p class="hint" data-testid="preview-note">{note}</p>
	<div class="upload">
		<label>
			mode
			<select bind:value={mode} data-testid="preview-mode">
				{#each modes as name (name)}
					<option value={name}>{name}</option>
				{/each}
			</select>
		</label>
		<button type="button" data-testid="preview-random" onclick={randomSample}>Random</button>
		<button type="button" data-testid="preview-degen" onclick={playForcedDegen}>Forced degen_spin</button>
		<input data-testid="preview-id" bind:value={roundId} placeholder="round id" />
		<button type="button" onclick={() => void loadId()}>Load</button>
		<button type="button" onclick={() => step(-1)} disabled={!events.length}>Prev</button>
		<button type="button" data-testid="preview-step" onclick={() => step(1)} disabled={!events.length}>Step</button>
	</div>
	<p class="hint" data-testid="preview-event">
		{lastAnnounce || 'no event'}
		{#if current}
			· win gate {winBindingAllowed(current) ? 'open' : 'closed'}
			· {JSON.stringify(current).slice(0, 180)}
		{/if}
	</p>
	<p class="hint">{tags.join(' · ')}</p>
</div>
