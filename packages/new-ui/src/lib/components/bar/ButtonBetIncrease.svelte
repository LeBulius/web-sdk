<script lang="ts">
	import { stateBet, stateBetDerived } from 'state-shared';
	// Was: handleIncreaseBet — betAmount goes up one step in stateConfig.betAmountOptions
	import { stateConfig } from 'state-shared';

	const onpress = () => {
		const options = stateConfig.betMenuOptions;
		const currentIndex = options.indexOf(stateBet.betAmount);
		if (currentIndex < options.length - 1) {
			stateBetDerived.setBetAmount(options[currentIndex + 1]);
		}
	};
</script>

<button
	onclick={onpress}
	class="p-1 text-gray-400 transition-colors hover:text-white"
	aria-label="Increase bet"
>
	<svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
		<polyline points="18 15 12 9 6 15" />
	</svg>
</button>
