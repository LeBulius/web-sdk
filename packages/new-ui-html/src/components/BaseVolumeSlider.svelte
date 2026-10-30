<script lang="ts">
	type Props = {
		label: string;
		icon: import('svelte').Snippet;
		value: number;
		onchange: (v: number) => void;
	};
	const { label, icon, value, onchange }: Props = $props();

	let prev = $state(value > 0 ? value : 50);
	const toggle = () => {
		if (value > 0) { prev = value; onchange(0); }
		else { onchange(prev > 0 ? prev : 50); }
	};
</script>

<!--
	Volume slider row used in SettingsModal.
	Icon slot + range input. Click icon to mute/restore. Slash shown when muted.
-->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="flex cursor-pointer items-center gap-3 rounded-md p-2 transition-colors hover:bg-gray-800"
	onclick={toggle}
>
	<div class="relative flex h-8 w-8 items-center justify-center text-white">
		{@render icon()}
		{#if value === 0}
			<div class="absolute h-[2px] w-[26px] -rotate-45 rounded-full bg-white shadow-[0_0_0_2px_rgba(17,24,39,1)]"></div>
		{/if}
	</div>
	<input
		type="range" min="0" max="100"
		value={value}
		oninput={(e) => onchange(Number((e.target as HTMLInputElement).value))}
		onclick={(e) => e.stopPropagation()}
		class="h-2 w-24 cursor-pointer appearance-none rounded-full accent-cyan-400"
		style="background: linear-gradient(to right, #22d3ee {value}%, #374151 {value}%);"
	/>
</div>
