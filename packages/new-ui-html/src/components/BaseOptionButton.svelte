<script lang="ts">
	type Props = {
		selected: boolean;
		onclick: () => void;
		children?: import('svelte').Snippet;
	};
	const { selected, onclick, children }: Props = $props();
</script>

<!-- Selectable grid button used in autoplay and bet menu grids. Highlights with a cyan border when selected. -->
<button
	{onclick}
	class="flex h-10 items-center justify-center rounded-lg text-sm font-bold transition-colors
		{selected
			? 'border-2 border-cyan-400 bg-gray-700 text-white'
			: 'border-2 border-transparent bg-gray-700 text-white hover:bg-gray-600'}"
>
	{#if children}{@render children()}{/if}
</button>
