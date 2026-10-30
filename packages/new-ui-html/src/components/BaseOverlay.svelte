<script lang="ts">
	import type { Snippet } from 'svelte';
	type Props = { onclick?: () => void; children: Snippet; };
	const { onclick, children }: Props = $props();
</script>

<!-- Semi-transparent full-screen backdrop. Click to close (when onclick is provided). -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm cursor-pointer"
	onclick={onclick}
>
	{@render children()}
</div>
