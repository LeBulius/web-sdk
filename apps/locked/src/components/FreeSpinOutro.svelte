<script lang="ts" module>
	import type { WinLevelData } from '../game/winLevelMap';

	export type EmitterEventFreeSpinOutro =
		| { type: 'freeSpinOutroShow' }
		| { type: 'freeSpinOutroHide' }
		| { type: 'freeSpinOutroCountUp'; amount: number; winLevelData: WinLevelData };
</script>

<script lang="ts">
	import { Text, REM } from 'pixi-svelte';
	import { FadeContainer, WinCountUpProvider } from 'components-pixi';
	import { waitForResolve, waitForTimeout } from 'utils-shared/wait';
	import { bookEventAmountToBalanceWinCurrencyString } from 'utils-shared/amount';
	import { CanvasSizeRectangle, MainContainer } from 'components-layout';
	import { OnMount } from 'components-shared';
	import { SECOND } from 'constants-shared/time';

	import { getContext } from '../game/context';
	import { gameT } from '../i18n/i18nDerived';
	import PressToContinue from './PressToContinue.svelte';

	const context = getContext();

	let show = $state(false);
	let amount = $state(0);
	let winLevelData = $state<WinLevelData>();
	let oncomplete = $state(() => {});
	let dismissed = $state(false);

	const dismiss = () => {
		if (dismissed) return;
		dismissed = true;
		oncomplete();
	};

	context.eventEmitter.subscribeOnMount({
		freeSpinOutroShow: () => {
			dismissed = false;
			show = true;
		},
		freeSpinOutroHide: () => (show = false),
		freeSpinOutroCountUp: async (emitterEvent) => {
			dismissed = false;
			amount = emitterEvent.amount;
			winLevelData = emitterEvent.winLevelData;
			const duration = Math.max(winLevelData?.presentDuration ?? 0, 800);
			const dismissedPromise = waitForResolve((resolve) => (oncomplete = resolve));
			// Prefer tap; never soft-lock the book player on Feature Complete.
			await Promise.race([dismissedPromise, waitForTimeout(duration + SECOND)]);
			dismiss();
		},
	});
</script>

<FadeContainer {show}>
	{#if winLevelData}
		{@const duration = Math.max(winLevelData.presentDuration, 800)}
		<WinCountUpProvider {amount} {duration} oncomplete={() => {}}>
			{#snippet children({ countUpAmount, startCountUp, finishCountUp, countUpCompleted })}
				{@const press = () => {
					if (!countUpCompleted) finishCountUp();
					dismiss();
				}}

				<CanvasSizeRectangle backgroundColor={0x05080c} backgroundAlpha={0.82} />
				<OnMount onmount={() => startCountUp()} />

				<MainContainer>
					<Text
						anchor={0.5}
						x={context.stateLayoutDerived.mainLayout().width * 0.5}
						y={context.stateLayoutDerived.mainLayout().height * 0.4}
						text={gameT('FEATURE COMPLETE')}
						style={{
							fontFamily: 'Outfit SemiBold',
							fontSize: REM * 1.4,
							fontWeight: '800',
							fill: 0xffcc66,
							letterSpacing: 4,
						}}
					/>
					<Text
						anchor={0.5}
						x={context.stateLayoutDerived.mainLayout().width * 0.5}
						y={context.stateLayoutDerived.mainLayout().height * 0.52}
						text={bookEventAmountToBalanceWinCurrencyString(countUpAmount)}
						style={{
							fontFamily: 'Outfit SemiBold',
							fontSize: REM * 2.6,
							fontWeight: '800',
							fill: 0xffffff,
						}}
					/>
				</MainContainer>

				<PressToContinue onpress={press} />
			{/snippet}
		</WinCountUpProvider>
	{/if}
</FadeContainer>
