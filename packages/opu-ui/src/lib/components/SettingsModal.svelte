<script lang="ts">
	import { Info, Music, Volume2 } from 'lucide-svelte';

	let { onOpenInfo }: { onOpenInfo: () => void } = $props();

	// No props needed anymore
	let musicVolume = $state(50);
	let soundVolume = $state(50);
	let prevMusicVolume = $state(50);
	let prevSoundVolume = $state(50);
</script>

<!-- Settings Panel - positioned above bar with gap, left-aligned, z-30 so bar stays on top -->
<div
	class="min-w-[180px] rounded-lg bg-gray-900/75 p-4 shadow-xl text-left"
>
	<div class="flex flex-col gap-4">
		<!-- Info Button -->
		<button
			onclick={onOpenInfo}
			class="flex w-full items-center gap-3 rounded-md p-2 text-white transition-colors hover:bg-gray-800 hover:text-cyan-400"
		>
			<div class="flex h-8 w-8 items-center justify-center">
				<Info class="h-6 w-6" />
			</div>
			<span class="text-sm font-medium">INFO</span>
		</button>

		<!-- Music Slider -->
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="flex cursor-pointer items-center gap-3 rounded-md p-2 transition-colors hover:bg-gray-800"
			onclick={() => {
				if (musicVolume > 0) {
					prevMusicVolume = musicVolume;
					musicVolume = 0;
				} else {
					musicVolume = prevMusicVolume > 0 ? prevMusicVolume : 50;
				}
			}}
		>
			<div class="relative flex h-8 w-8 items-center justify-center text-white">
				<Music class="h-6 w-6" />
				{#if musicVolume === 0}
					<div class="absolute h-[2px] w-[26px] -rotate-45 rounded-full bg-white shadow-[0_0_0_2px_rgba(17,24,39,1)]"></div>
				{/if}
			</div>
			<input
				type="range"
				min="0"
				max="100"
				bind:value={musicVolume}
				onclick={(e) => e.stopPropagation()}
				class="h-2 w-24 cursor-pointer appearance-none rounded-full accent-cyan-400 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-400 [&::-webkit-slider-thumb]:cursor-pointer"
				style="background: linear-gradient(to right, #22d3ee {musicVolume}%, #374151 {musicVolume}%);"
			/>
		</div>

		<!-- Sound Slider -->
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="flex cursor-pointer items-center gap-3 rounded-md p-2 transition-colors hover:bg-gray-800"
			onclick={() => {
				if (soundVolume > 0) {
					prevSoundVolume = soundVolume;
					soundVolume = 0;
				} else {
					soundVolume = prevSoundVolume > 0 ? prevSoundVolume : 50;
				}
			}}
		>
			<div class="relative flex h-8 w-8 items-center justify-center text-white">
				<Volume2 class="h-6 w-6" />
				{#if soundVolume === 0}
					<div class="absolute h-[2px] w-[26px] -rotate-45 rounded-full bg-white shadow-[0_0_0_2px_rgba(17,24,39,1)]"></div>
				{/if}
			</div>
			<input
				type="range"
				min="0"
				max="100"
				bind:value={soundVolume}
				onclick={(e) => e.stopPropagation()}
				class="h-2 w-24 cursor-pointer appearance-none rounded-full accent-cyan-400 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-400 [&::-webkit-slider-thumb]:cursor-pointer"
				style="background: linear-gradient(to right, #22d3ee {soundVolume}%, #374151 {soundVolume}%);"
			/>
		</div>
	</div>
</div>
