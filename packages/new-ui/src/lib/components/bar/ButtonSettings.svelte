<script lang="ts">
	import { stateModal } from 'state-shared';
	// Was: uiStore.showSettings, handleToggleSettings
	import { Menu, X } from 'lucide-svelte';

	const isOpen = $derived(stateModal.modal?.name === 'settings');

	const onpress = () => {
		stateModal.modal = isOpen ? null : { name: 'settings' };
	};
</script>

<button
	onclick={onpress}
	class="flex h-10 w-10 items-center justify-center rounded-md transition-colors hover:bg-gray-700/50"
	aria-label={isOpen ? 'Close settings' : 'Open settings'}
>
	{#if isOpen}
		<X class="h-5 w-5 text-white" />
	{:else}
		<Menu class="h-5 w-5 text-gray-400" />
	{/if}
</button>
