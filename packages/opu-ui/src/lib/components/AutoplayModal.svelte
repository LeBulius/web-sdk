<script lang="ts">
	import { Infinity } from 'lucide-svelte';

	let {
		onSelect,
		selected
	}: {
		onSelect: (rounds: number | null) => void;
		selected: number | null;
	} = $props();

	const ROUND_OPTIONS = [
		{ value: -1, label: 'infinity', icon: true },
		{ value: 10, label: '10' },
		{ value: 25, label: '25' },
		{ value: 50, label: '50' },
		{ value: 100, label: '100' },
		{ value: 250, label: '250' },
		{ value: 500, label: '500' },
		{ value: 1000, label: '1000' }
	];

	const handleSelect = (value: number) => {
		onSelect(value === -1 ? null : value);
	};
</script>

<!-- Modal - positioned above bar with gap, right-aligned, z-30 so bar stays on top -->
<div
	class="min-w-[260px] rounded-lg bg-gray-900/75 p-5 shadow-xl text-left"
>
	<!-- Header -->
	<div class="mb-4">
		<h3 class="text-lg font-bold text-white">AUTOPLAY</h3>
		<p class="text-xs text-gray-400">NUMBER OF ROUNDS</p>
	</div>

	<!-- Round Options Grid -->
	<div class="grid grid-cols-4 gap-2">
		{#each ROUND_OPTIONS as option (option.label)}
			{@const isSelected = (option.value === -1 && selected === null) || option.value === selected}
			<button
				onclick={() => handleSelect(option.value)}
				class={`flex h-10 items-center justify-center rounded-lg text-sm font-bold transition-colors ${
					isSelected
						? 'border-2 border-cyan-400 bg-gray-700 text-white'
						: 'border-2 border-transparent bg-gray-700 text-white hover:bg-gray-600'
				}`}
			>
				{#if option.icon}
					<Infinity class="h-5 w-5" />
				{:else}
					{option.label}
				{/if}
			</button>
		{/each}
	</div>
</div>
