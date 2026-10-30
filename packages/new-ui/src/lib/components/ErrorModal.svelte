<script lang="ts">
	let {
		type,
		onClose
	}: {
		type: 'insufficient-balance' | 'reload';
		onClose?: () => void;
	} = $props();

	const messages = {
		'insufficient-balance': 'Insufficient balance',
		'reload': 'Please reload page'
	};
</script>

<!-- Full-screen blurred overlay -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	onclick={onClose}
	class="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm cursor-pointer"
>

	<!-- Error box — dark with red border, matches mockup -->
	<div class="flex w-80 flex-col items-center justify-center gap-3 rounded-2xl border-2 border-red-600 bg-gray-950/95 px-10 py-10 shadow-[0_0_30px_rgba(220,38,38,0.4)]">
		<p class="text-xl font-black tracking-widest text-white">ERROR</p>
		<p class="text-center text-sm font-medium text-gray-200">{messages[type]}</p>
	</div>

</div>
