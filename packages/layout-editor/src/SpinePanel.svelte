<script lang="ts">
	import { onMount } from 'svelte';

	import { loadEventCatalogue } from './events/catalogue';
	import { dispatchSpineBindings, listVisualItems } from './spine/adapter';
	import { bindSpineEvent, layoutStore, saveLayout } from './store.svelte';

	let events = $state<string[]>([]);
	let slotIds = $state<string[]>([]);
	let selected = $state('character');
	let note = $state('');

	const spine = $derived(layoutStore.data.spine as Record<string, unknown>);
	const art = $derived(layoutStore.data.art as Record<string, unknown>);
	const items = $derived(listVisualItems(art, spine, slotIds));
	const current = $derived(items.find((item) => item.id === selected) ?? items[0]);
	const spineCount = $derived(items.filter((item) => item.kind === 'spine').length);
	const staticCount = $derived(items.filter((item) => item.kind === 'static').length);

	onMount(() => {
		void loadEventCatalogue().then((result) => {
			if (!result || !('catalogue' in result) || !result.catalogue || typeof result.catalogue !== 'object') return;
			const list = (result.catalogue as { events?: { type?: string }[] }).events ?? [];
			events = list.flatMap((entry) => (typeof entry.type === 'string' ? [entry.type] : []));
		});
		void fetch('/dev/art-slots.json').then(async (response) => {
			if (!response.ok) return;
			const body = (await response.json()) as { slots?: { id: string }[] };
			slotIds = (body.slots ?? []).flatMap((slot) => (slot.id ? [slot.id] : []));
		});
	});

	function onDrop(bookEvent: string, event: DragEvent) {
		event.preventDefault();
		const anim = event.dataTransfer?.getData('text/plain') ?? '';
		const skeleton = current?.skeletonKey;
		if (!anim || !skeleton) {
			note = 'static item: binding is a no-op until a Spine export is added';
			return;
		}
		bindSpineEvent({ bookEvent, skeleton, anim, target: 'global' });
		void saveLayout('spine');
		note = `${anim} → ${bookEvent}`;
	}

	function forceReveal() {
		const results = dispatchSpineBindings({ type: 'reveal', index: 0 }, spine, art);
		note = results.length
			? results.map((result) => [result.mode, result.anim, result.reason].filter(Boolean).join(' ')).join(', ')
			: 'no reveal bindings';
	}
</script>

<p class="hint" data-testid="spine-summary">
	{spineCount} spine · {staticCount} static. A Spine export is optional. The static WebP stays until one is added, then it replaces the still with no code change.
</p>

<ul class="spine-list" data-testid="spine-list">
	{#each items as item (item.id)}
		<li>
			<button
				type="button"
				class:active={item.id === current?.id}
				data-kind={item.kind}
				data-testid="spine-item-{item.id}"
				onclick={() => (selected = item.id)}
			>
				{item.id}
				<span class="badge">{item.kind === 'spine' ? 'Spine' : 'Static'}</span>
			</button>
		</li>
	{/each}
</ul>

{#if current}
	<div data-testid="spine-inspector">
		{#if current.kind === 'spine'}
			<p class="hint">
				{current.skeletonKey} · Spine {current.version ?? '4.2'} · pma {current.pma ? 'from atlas' : 'off'}
			</p>
			<div class="upload">
				{#each current.animations ?? [] as anim (anim)}
					<button
						type="button"
						draggable="true"
						ondragstart={(event) => event.dataTransfer?.setData('text/plain', anim)}
					>
						{anim}
					</button>
				{/each}
			</div>
		{:else}
			<p class="hint">
				Static WebP {current.texture || '(no still yet)'}. Event bindings on this item no-op until a Spine export lands in this slot.
			</p>
		{/if}
	</div>
{/if}

<div class="upload" data-testid="spine-events">
	{#each events as bookEvent (bookEvent)}
		<button
			type="button"
			ondragover={(event) => event.preventDefault()}
			ondrop={(event) => onDrop(bookEvent, event)}
		>
			{bookEvent}
		</button>
	{/each}
	<button type="button" data-testid="spine-force" onclick={forceReveal}>Force reveal</button>
	<span data-testid="spine-note">{note}</span>
</div>

<style>
	.hint { margin: 0; color: #c8c2b4; }
	.upload { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
	.spine-list {
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
		max-height: 7.5rem;
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
	.badge {
		margin-left: 6px;
		font-size: 10px;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: #f6edd8;
	}
	button[data-kind='static'] .badge { color: #c8c2b4; }
</style>
