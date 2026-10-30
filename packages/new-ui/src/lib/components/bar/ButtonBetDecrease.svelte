<script lang="ts">
	import { stateBet, stateBetDerived, stateConfig } from 'state-shared';
	// Was: handleDecreaseBet

	const onpress = () => {
		const options = stateConfig.betMenuOptions;
		const currentIndex = options.indexOf(stateBet.betAmount);
		if (currentIndex > 0) {
			stateBetDerived.setBetAmount(options[currentIndex - 1]);
		}
	};
</script>

<button
	onclick={onpress}
	class="p-1 text-gray-400 transition-colors hover:text-white"
	aria-label="Decrease bet"
>
	<svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
		<polyline points="6 9 12 15 18 9" />
	</svg>
</button>
