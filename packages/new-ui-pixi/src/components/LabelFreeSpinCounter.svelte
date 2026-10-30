<script lang="ts">
	import { stateUi } from 'state-shared';

	import UiLabel from './UiLabel.svelte';
	import { i18nDerived } from '../i18n/i18nDerived';

	type Props = {
		stacked?: boolean;
	};

	const props: Props = $props();
	const label = $derived(i18nDerived.freeSpins());
	// freeSpinCounterCurrent = spins remaining after the current spin (0 on last).
	const value = $derived(String(Math.max(0, stateUi.freeSpinCounterCurrent)));
</script>

<UiLabel tiled {label} {value} stacked={props.stacked} />
