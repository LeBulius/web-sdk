<script lang="ts">
	import type { Snippet } from 'svelte';
	type Props = { children: Snippet; dark?: boolean };
	const { children, dark = false }: Props = $props();
</script>

<!-- Modal heading. Light or dark variant to match the card behind it. -->
<h2 class="text-center text-base font-bold tracking-wide px-6 pt-4
	{dark ? 'text-white' : 'text-gray-800'}">
	{@render children()}
</h2>
