<script lang="ts">
	import { RefreshCw } from 'lucide-svelte';
	import { stateBetDerived } from 'state-shared';

	type Props = { onclick: () => void };
	const { onclick }: Props = $props();

	const active = $derived(stateBetDerived.hasAutoBetCounter());
</script>

<!-- Autoplay toggle button. Active (highlighted) when autoplay is running. Click opens the modal or stops autoplay. -->
<button
	{onclick}
	class="flex h-9 w-9 items-center justify-center rounded-full border-2 shadow-md transition-colors
		{active
			? 'border-cyan-400 bg-cyan-400 hover:bg-cyan-300'
			: 'border-gray-900 bg-white hover:bg-gray-100'}"
	aria-label="Autoplay"
>
	<RefreshCw class="h-4 w-4 {active ? 'text-gray-900' : 'text-gray-800'}" />
</button>
