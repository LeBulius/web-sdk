<!--
	Last child of pixi-svelte <App>. import.meta.env.DEV is statically false in
	production, so the dynamic import (and the overlay, panel, and Tweakpane) is dropped.
-->
<script lang="ts">
	const DEV = import.meta.env.DEV;
	const overlay = DEV ? import('./EditorOverlay.svelte') : undefined;
</script>

{#if overlay}
	{#await overlay then module}
		<module.default />
	{/await}
{/if}
