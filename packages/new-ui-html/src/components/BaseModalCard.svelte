<script lang="ts">
	import type { Snippet } from 'svelte';
	type Props = { children: Snippet; dark?: boolean; maxWidth?: string };
	const { children, dark = false, maxWidth = '320px' }: Props = $props();
</script>

<!-- Rounded modal card container. Use dark=true for dark glass cards, default is white. -->
<div
	class="relative z-10 overflow-hidden rounded-2xl shadow-2xl"
	style="max-width: {maxWidth}; width: 100%"
	style:background={dark ? 'rgba(17,24,39,0.92)' : '#ffffff'}
>
	{@render children()}
</div>
