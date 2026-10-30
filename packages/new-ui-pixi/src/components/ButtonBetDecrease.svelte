<script lang="ts">
	import { ChevronDown } from 'lucide-svelte';
	import { stateBet, stateBetDerived } from 'state-shared';

	const disabled = $derived(!stateBetDerived.isBetCostAvailable() || !stateBet.isIdle);

	type Props = { onclick: () => void };
	const { onclick }: Props = $props();
</script>

<!-- Decreases the current bet by one step. Disabled when not idle or at minimum bet. -->
<button
	{onclick}
	{disabled}
	class="p-1 text-gray-400 transition-colors hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
	aria-label="Decrease bet"
>
	<ChevronDown class="h-7 w-7" />
</button>
