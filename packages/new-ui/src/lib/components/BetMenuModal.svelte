<script lang="ts">
	let {
		currentBet,
		betAmounts,
		onSelectBet
	}: {
		currentBet: number;
		betAmounts: number[];
		onSelectBet: (bet: number) => void;
	} = $props();
</script>

<!-- Bet Menu Box - positioned above center of bar with gap, z-30 so bar stays on top -->
<div
	class="w-[340px] rounded-lg bg-gray-900/75 p-4 shadow-xl"
>
	<!-- Header -->
	<div class="mb-4 text-center">
		<h2 class="text-lg font-bold tracking-wide text-white">BET MENU</h2>
	</div>

	<!-- Bet Grid -->
	<div class="grid max-h-[320px] grid-cols-4 gap-2 overflow-y-auto">
		{#each betAmounts as amount (amount)}
			<button
				onclick={() => onSelectBet(amount)}
				class={`rounded-lg px-1 py-2 text-sm font-bold transition-colors ${
					currentBet === amount
						? 'bg-cyan-400 text-gray-900'
						: 'bg-transparent text-white hover:bg-gray-700/50'
				}`}
			>
				${amount.toFixed(2)}
			</button>
		{/each}
	</div>
</div>
