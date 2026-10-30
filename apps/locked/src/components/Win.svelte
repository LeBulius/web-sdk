<script lang="ts" module>
	import type { WinLevelData } from '../game/winLevelMap';

	export type EmitterEventWin =
		| { type: 'winShow' }
		| { type: 'winHide' }
		| { type: 'winUpdate'; amount: number; winLevelData: WinLevelData };
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
	import PressToContinue from './PressToContinue.svelte';

	const context = getContext();

	let show = $state(false);
	let amount = $state(0);
	let winLevelData = $state<WinLevelData>();
	let oncomplete = $state(() => {});
	let onCountUpComplete = $state(() => {});

	context.eventEmitter.subscribeOnMount({
		winShow: () => (show = true),
		winHide: () => (show = false),
		winUpdate: async (emitterEvent) => {
			amount = emitterEvent.amount;
			winLevelData = emitterEvent.winLevelData;
			if (!winLevelData || winLevelData.presentDuration <= 0) {
				await waitForTimeout(50);
				return;
			}
			// Cap wait: count-up can be skipped via tap; never block the book forever.
			const dismissed = waitForResolve((resolve) => (oncomplete = resolve));
			await Promise.race([dismissed, waitForTimeout(winLevelData.presentDuration + SECOND)]);
			oncomplete = () => {};
		},
	});
</script>

<FadeContainer {show}>
	{#if winLevelData && winLevelData.presentDuration > 0}
		{@const isBigWin = winLevelData.type === 'big'}
		{@const duration = winLevelData.presentDuration}
		<WinCountUpProvider {amount} {duration} oncomplete={() => onCountUpComplete()}>
			{#snippet children({ countUpAmount, startCountUp, finishCountUp, countUpCompleted })}
				{#if isBigWin}
					<CanvasSizeRectangle backgroundColor={0x000000} backgroundAlpha={0.55} />
				{/if}

				<OnMount
					onmount={async () => {
						await startCountUp();
						// Short hold after count-up, then dismiss (tap can dismiss earlier).
						await waitForTimeout(Math.min(SECOND, duration));
						oncomplete();
					}}
				/>

				<MainContainer>
					<Text
						anchor={0.5}
						x={context.stateLayoutDerived.mainLayout().width * 0.5}
						y={context.stateLayoutDerived.mainLayout().height * 0.42}
						text={winLevelData.text ?? 'WIN'}
						style={{
							fontFamily: 'Outfit SemiBold',
							fontSize: REM * (isBigWin ? 2.2 : 1.4),
							fontWeight: '800',
							fill: 0xffe08a,
							letterSpacing: 4,
						}}
						alpha={winLevelData.text ? 1 : 0}
					/>
					<Text
						anchor={0.5}
						x={context.stateLayoutDerived.mainLayout().width * 0.5}
						y={context.stateLayoutDerived.mainLayout().height * 0.52}
						text={bookEventAmountToBalanceWinCurrencyString(countUpAmount)}
						style={{
							fontFamily: 'Outfit SemiBold',
							fontSize: REM * (isBigWin ? 3 : 2),
							fontWeight: '800',
							fill: 0xffffff,
						}}
					/>
				</MainContainer>

				<!-- During count-up: jump to total. After: dismiss early. -->
				<PressToContinue onpress={() => (countUpCompleted ? oncomplete() : finishCountUp())} />
			{/snippet}
		</WinCountUpProvider>
	{/if}
</FadeContainer>
