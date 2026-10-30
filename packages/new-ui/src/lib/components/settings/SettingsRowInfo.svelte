<script lang="ts">
	import { Info } from 'lucide-svelte';
	import { handleOpenInfo } from '$lib/stores/uiHandlers';
	// Step 6: replace with → stateModal.modal = { name: 'info' }
</script>

<!-- Info row in Settings -->
<button
	onclick={handleOpenInfo}
	class="flex w-full items-center gap-3 rounded-md p-2 text-white transition-colors hover:bg-gray-800 hover:text-cyan-400"
>
	<div class="flex h-8 w-8 items-center justify-center">
		<Info class="h-6 w-6" />
	</div>
	<span class="text-sm font-medium">INFO</span>
</button>
