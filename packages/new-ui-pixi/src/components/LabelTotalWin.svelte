<script lang="ts">
	import { stateBet } from 'state-shared';
	import { bookEventAmountToCurrencyString } from 'utils-shared/amount';
	import { i18nDerived } from '../../i18n/i18nDerived';
</script>

<!-- Total win label shown in the Free Games bar. Displays the cumulative win across all free spins. -->
<div class="flex flex-col items-center justify-center rounded-md border-2 border-gray-900 bg-white px-3 py-0.5">
	<span class="text-[10px] font-bold tracking-widest text-cyan-400">{i18nDerived.totalWin()}</span>
	<span class="text-xl font-bold leading-tight text-gray-900">
		{bookEventAmountToCurrencyString(stateBet.winBookEventAmount)}
	</span>
</div>
