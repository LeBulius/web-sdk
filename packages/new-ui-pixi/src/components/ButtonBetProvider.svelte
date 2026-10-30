<script lang="ts" module>
	export type ButtonBetKey =
		| 'spin_default'
		| 'spin_disabled'
		| 'spin_active'
		| 'auto_start'
		| 'stop_auto';
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';

	import {
		AUTO_SPINS_TEXT_OPTION_MAP,
		stateBet,
		stateBetDerived,
		stateStorybook,
		stateUi,
	} from 'state-shared';

	import { getContext } from '../context';

	type Props = {
		children: Snippet<
			[
				{
					key: ButtonBetKey;
					onpress: () => void;
					disabled: boolean;
				},
			]
		>;
	};

	const props: Props = $props();
	const context = getContext();

	let stopDisabled = $state(false);

	const bet = () => {
		if (stateBetDerived.activeBetMode()?.type === 'buy') stateBet.activeBetModeKey = 'BASE';
		context.eventEmitter.broadcast({ type: 'bet' });
	};

	const startAuto = () => {
		stateBet.autoSpinsCounter = AUTO_SPINS_TEXT_OPTION_MAP[stateUi.autoSpinsText];
		stateBet.autoSpinsLossLimitAmount = Infinity;
		stateBet.autoSpinsSingleWinLimitAmount = Infinity;
		if (stateBetDerived.activeBetMode()?.type === 'buy') stateBet.activeBetModeKey = 'BASE';
		stateUi.autoplayMenuOpen = false;
		context.eventEmitter.broadcast({ type: 'autoBet' });
	};

	const stopAuto = () => {
		if (!stopDisabled) {
			stateBet.autoSpinsCounter = 0;
			context.eventEmitter.broadcast({ type: 'stopButtonClick' });
		}
	};

	const getKey = (): ButtonBetKey => {
		if (stateUi.autoplayMenuOpen) return 'auto_start';

		// Autoplay armed/running — spin becomes stop (RGS xstate or Storybook local loop)
		if (stateBetDerived.hasAutoBetCounter() && !stopDisabled) return 'stop_auto';

		// Lock during RGS bet/autoplay, or Storybook local book play (bypasses xstate)
		const inPlay =
			context.stateXstateDerived.isBetting() ||
			context.stateXstateDerived.isAutoBetting() ||
			stateStorybook.playing;

		if (inPlay) return 'spin_active';

		if (!stateBetDerived.isBetCostAvailable()) return 'spin_disabled';
		return 'spin_default';
	};

	const key = $derived.by(getKey);
	// Only spin_active is non-interactive (plus can't-afford)
	const disabled = $derived(key === 'spin_active' || key === 'spin_disabled');

	const onpress = () => {
		if (key === 'spin_active' || key === 'spin_disabled') return;

		context.eventEmitter.broadcast({ type: 'soundPressBet' });

		if (key === 'stop_auto') {
			stopAuto();
			return;
		}

		if (key === 'auto_start') {
			startAuto();
			return;
		}

		bet();
	};

	context.eventEmitter.subscribeOnMount({
		stopButtonClick: () => (stopDisabled = true),
		stopButtonEnable: () => (stopDisabled = false),
	});
</script>

{@render props.children({ key, onpress, disabled })}
