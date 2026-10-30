<!--
	DOM chrome for the builder. Dev-only, same gate as LayoutEditorMount, so
	production builds drop the shell, the upload client, and the catalogue hooks.
-->
<script lang="ts">
	const DEV = import.meta.env.DEV;
	const shell = DEV ? import('./BuilderShell.svelte') : undefined;
</script>

{#if shell}
	{#await shell then module}
		<module.default />
	{/await}
{/if}
