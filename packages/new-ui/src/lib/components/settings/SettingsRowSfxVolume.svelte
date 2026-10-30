<script lang="ts">
	import { stateSound } from 'state-shared';
	import { Volume2 } from 'lucide-svelte';
	// Was: local soundVolume / prevSoundVolume state

	let prevVolume = stateSound.volumeValueSoundEffect;
</script>

<!-- SFX volume row -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="flex cursor-pointer items-center gap-3 rounded-md p-2 transition-colors hover:bg-gray-800"
	onclick={() => {
		if (stateSound.volumeValueSoundEffect > 0) {
			prevVolume = stateSound.volumeValueSoundEffect;
			stateSound.volumeValueSoundEffect = 0;
		} else {
			stateSound.volumeValueSoundEffect = prevVolume > 0 ? prevVolume : 75;
		}
	}}
>
	<div class="relative flex h-8 w-8 items-center justify-center text-white">
		<Volume2 class="h-6 w-6" />
		{#if stateSound.volumeValueSoundEffect === 0}
			<div class="absolute h-[2px] w-[26px] -rotate-45 rounded-full bg-white shadow-[0_0_0_2px_rgba(17,24,39,1)]"></div>
		{/if}
	</div>
	<input
		type="range"
		min="0"
		max="100"
		bind:value={stateSound.volumeValueSoundEffect}
		onclick={(e) => e.stopPropagation()}
		class="h-2 w-24 cursor-pointer appearance-none rounded-full accent-cyan-400 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-400 [&::-webkit-slider-thumb]:cursor-pointer"
		style="background: linear-gradient(to right, #22d3ee {stateSound.volumeValueSoundEffect}%, #374151 {stateSound.volumeValueSoundEffect}%);"
	/>
</div>
