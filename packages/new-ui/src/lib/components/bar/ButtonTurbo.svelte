<script lang="ts">
	import { stateBet, stateBetDerived } from 'state-shared';
	// Was: uiStore.turboEnabled, handleTurboToggle
	import { Zap } from 'lucide-svelte';

	const onpress = () => {
		stateBetDerived.updateIsTurbo(!stateBet.isTurbo, { persistent: true });
	};
</script>

<button
	onclick={onpress}
	class="flex h-9 w-9 items-center justify-center rounded-full border-2 border-gray-900 shadow-md transition-colors
		{stateBet.isTurbo ? 'bg-cyan-400 hover:bg-cyan-500' : 'bg-white hover:bg-gray-100'}"
	aria-label="Turbo mode"
>
	<Zap class="h-4 w-4 {stateBet.isTurbo ? 'text-gray-900' : 'text-gray-800'}" />
</button>
