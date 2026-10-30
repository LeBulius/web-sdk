<script lang="ts">
	import BaseOverlay from './BaseOverlay.svelte';
	import { i18nDerived } from '../i18n/i18nDerived';

	type Props = {
		isOpen: boolean;
		errorType: 'insufficient-balance' | 'reload';
		onClose?: () => void;
	};
	const { isOpen, errorType, onClose }: Props = $props();

	const messages = {
		'insufficient-balance': 'Insufficient balance.',
		'reload': 'Please reload the page.',
	};
</script>

<!-- Full-screen error overlay with a red-bordered card. Click anywhere to dismiss (when onClose provided). -->
{#if isOpen}
	<BaseOverlay onclick={onClose}>
		<div class="flex w-80 flex-col items-center justify-center gap-3 rounded-2xl border-2 border-red-600 bg-gray-950/95 px-10 py-10 shadow-[0_0_30px_rgba(220,38,38,0.4)]">
			<p class="text-xl font-black tracking-widest text-white">{i18nDerived.error()}</p>
			<p class="text-center text-sm font-medium text-gray-200">{messages[errorType]}</p>
		</div>
	</BaseOverlay>
{/if}
