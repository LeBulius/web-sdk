<script lang="ts">
	import { i18nDerived } from '../../i18n/i18nDerived';

	type Props = { count: number };
	const { count }: Props = $props();
</script>

<!-- Free spins remaining counter shown in the Free Games bar. -->
<div class="flex overflow-hidden rounded-md border-2 border-gray-900 bg-white">
	<span class="flex flex-1 items-center px-3 text-xs font-bold tracking-widest text-gray-800">
		{i18nDerived.freeSpins()}
	</span>
	<div class="flex items-center justify-center border-l border-gray-300 bg-gray-100 px-3">
		<span class="text-xl font-bold text-gray-900">{count}</span>
	</div>
</div>
