<script lang="ts">
	import { i18nDerived } from '../../i18n/i18nDerived';

	type Props = {
		extraChanceActive?: boolean;
		layoutType?: 'portrait' | 'landscape' | 'desktop';
		onclick: () => void;
	};

	const { extraChanceActive = false, layoutType = 'desktop', onclick }: Props = $props();
</script>

<!--
	Bonus/Disable button shown beside the control bar.
	- Default: cyan "BONUS" — opens the features/buy-bonus modal.
	- When extra chance is active: red "DISABLE" — deactivates extra chance.
-->
<button
	{onclick}
	class="flex h-16 w-16 items-center justify-center rounded-full shadow-lg transition-colors
		{layoutType === 'landscape' ? 'mb-3' : 'mr-3'}
		{extraChanceActive ? 'bg-red-500 hover:bg-red-600' : 'bg-cyan-400 hover:bg-cyan-500'}"
	aria-label={extraChanceActive ? 'Disable extra chance' : 'Open bonus features'}
>
	<div class="flex h-[58px] w-[58px] items-center justify-center rounded-full border-2 border-gray-900">
		<span class="text-[10px] font-black tracking-tight text-gray-900">
			{extraChanceActive ? i18nDerived.disable() : i18nDerived.bonus()}
		</span>
	</div>
</button>
